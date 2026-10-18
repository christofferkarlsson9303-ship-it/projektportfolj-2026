"""Parse EBR KLG 1:26 (pdftotext -layout) into structured rows for P1, P2, P3."""
import re, json, sys, csv

src = sys.argv[1]
lines = open(src, encoding="utf-8").read().split("\n")

UNITS = r"(delstr|stp|Stn|stn|kund|km|st|m|m2|m²|m3|m³|sats|grp|tim|ha|ton|kg|dag|anl|tkr|kr|sträcka|gång|lev|plats|par|fas|km2|100 m|10 m|st/km|km/st|obj|vecka|mån|pkt)"
ROW = re.compile(r"^\s{2,}(\d{2})\s+(.*?)\s{2,}" + UNITS + r"\s+([-\d].*)$")
HEAD_P1 = re.compile(r"^\s{0,8}([GU]\d{3})(?:\s{2,}(\S.*?))?\s*$")
HEAD_P23 = re.compile(r"^\s{0,8}(\d{3})(?:\s{2,}(\S.*?))?\s*$")
NUMTOK = re.compile(r"^-?\d+(,\d+)?$")
SKIPWORDS = ("Arb Löp", "kod nr", "Planeringskatalog", "Produktionskatalog", "Enh")

def find_section_starts():
    p1 = p2 = p3 = None
    for i, l in enumerate(lines):
        s = l.strip()
        if s == "2. Planeringskatalog, P1" and p1 is None and i > 300: p1 = i
        if s == "3. Planeringskatalog, P2" and p2 is None and i > 300: p2 = i
        if s == "4. Produktionskatalog, P3" and p3 is None and i > 300: p3 = i
    return p1, p2, p3

def to_num(tokens):
    if tokens == ["-"]: return None
    s = "".join(tokens).replace(",", ".")
    return float(s)

def groupings(tokens, n):
    """Yield ways to split tokens into n Swedish-formatted numbers."""
    if n == 0:
        if not tokens: yield []
        return
    if not tokens: return
    first = tokens[0]
    if first == "-":
        for rest in groupings(tokens[1:], n - 1):
            yield [["-"]] + rest
        return
    if not NUMTOK.match(first): return
    # value = first + k 3-digit groups
    k = 0
    while True:
        grp = tokens[: 1 + k]
        if k > 0 and not re.fullmatch(r"\d{3}(,\d+)?", tokens[k]): break
        if k > 0 and "," in tokens[k - 1] if k > 1 else False: break
        for rest in groupings(tokens[1 + k:], n - 1):
            yield [grp] + rest
        k += 1
        if 1 + k > len(tokens): break

def parse_cost_row(rest):
    """rest: '<bered> <mont> <maskin> <arbete> <material> <maskin kr> <övrigt> <summa> [kommentar]'"""
    toks = rest.split()
    # split numeric prefix from comment
    numtoks = []
    for t in toks:
        if t == "-" or NUMTOK.match(t): numtoks.append(t)
        else: break
    comment = " ".join(toks[len(numtoks):])
    best = None
    for n_extra in range(0, 4):  # trailing numeric tokens may belong to comment
        cand = numtoks[: len(numtoks) - n_extra] if n_extra else numtoks
        for g in groupings(cand, 8):
            try:
                vals = [to_num(x) for x in g]
            except ValueError:
                continue
            b, mo, ma, arb, mat, mk, ov, summa = vals
            if summa is None: continue
            tot = sum(v or 0 for v in (arb, mat, mk, ov))
            if abs(tot - summa) > 3: continue
            hours_grouped = any(len(x) > 1 for x in g[:3])
            arb_est = (b or 0) * 1077 + (mo or 0) * 982
            err = abs(arb_est - (arb or 0)) / max(1, abs(arb or 1))
            score = (hours_grouped, round(err, 2))
            if best is None or score < best[0]:
                extra = " ".join(numtoks[len(cand):])
                best = (score, vals, (extra + " " + comment).strip())
        if best: break
    if not best: return None
    b, mo, ma, arb, mat, mk, ov, summa = best[1]
    return dict(bered_h=b, mont_h=mo, maskin_h=ma, arbete_kr=arb, material_kr=mat,
                maskin_kr=mk, ovrigt_kr=ov, summa_kr=summa, kommentar=best[2])

def parse_p3_row(rest):
    toks = rest.split()
    nums = []
    for t in toks:
        if (t == "-" or NUMTOK.match(t)) and len(nums) < 4: nums.append(t)
        else: break
    if len(nums) < 3: return None
    def f(t): return None if t == "-" else float(t.replace(",", "."))
    vals = [f(t) for t in nums] + [None] * (4 - len(nums))
    tail = toks[len(nums):]
    tidsunderlag = ""
    if tail and re.fullmatch(r"[A-Z]{1,3}\d{2,4}[A-Za-z]?", tail[-1]):
        tidsunderlag = tail[-1]; tail = tail[:-1]
    return dict(bered_h=vals[0], mont_h=vals[1], maskin_h=vals[2], antal_man=vals[3],
                kommentar=" ".join(tail), tidsunderlag=tidsunderlag)

def parse_section(start, end, katalog):
    rows, kod, kodtext = [], None, ""
    pending_desc = ""
    head_re = HEAD_P1 if katalog == "P1" else HEAD_P23
    for i in range(start, end):
        l = lines[i].replace("\t", "  ")
        s = l.strip()
        if not s or any(s.startswith(w) for w in SKIPWORDS) or (re.fullmatch(r"\d{1,3}", s) and len(l) - len(l.lstrip()) > 8):
            continue
        m = head_re.match(l)
        if m and not ROW.match(l) and not re.search(r"\s(km|st)\s", l):
            kod = m.group(1)
            if m.group(2):
                kodtext = m.group(2).strip()
            else:  # header text wrapped around code line
                above = lines[i-1].strip(); below = lines[i+1].strip()
                kodtext = (above + " " + below).strip() if len(above) < 60 else below
            pending_desc = ""
            continue
        r = ROW.match(l)
        if r and kod:
            lop, desc, enh, rest = r.group(1), r.group(2).strip(), r.group(3), r.group(4)
            parsed = parse_p3_row(rest) if katalog == "P3" else parse_cost_row(rest)
            if not desc:
                desc = pending_desc
                # continuation on next line
                nxt = lines[i + 1].strip() if i + 1 < end else ""
                if nxt and not ROW.match(lines[i + 1]) and not head_re.match(lines[i + 1]) and len(nxt) < 45:
                    desc = (desc + " " + nxt.split("  ")[0]).strip()
            pending_desc = ""
            if parsed is None:
                continue
            rows.append(dict(katalog=katalog, arbkod=kod, grupp=kodtext, lopnr=lop,
                             kod=f"{kod}.{lop}", benamning=desc, enhet=enh, **parsed))
        else:
            # possible desc-only line preceding a row with blank desc
            chunk = s.split("  ")[0]
            if len(chunk) < 55 and not re.search(r"\d{3} \d{3}", s):
                pending_desc = chunk
    return rows

p1, p2, p3 = find_section_starts()
all_rows = parse_section(p1, p2, "P1") + parse_section(p2, p3, "P2") + parse_section(p3, len(lines), "P3")
# de-dup (page repeat headers can't create dup rows but be safe)
seen, out = set(), []
for r in all_rows:
    k = (r["katalog"], r["kod"])
    if k in seen: continue
    seen.add(k); out.append(r)
json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=0)
fields = ["katalog","arbkod","grupp","lopnr","kod","benamning","enhet","bered_h","mont_h","maskin_h",
          "arbete_kr","material_kr","maskin_kr","ovrigt_kr","summa_kr","antal_man","kommentar","tidsunderlag"]
with open(sys.argv[3], "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=fields, delimiter=";"); w.writeheader()
    for r in out: w.writerow({k: r.get(k, "") for k in fields})
from collections import Counter
print(Counter(r["katalog"] for r in out))
