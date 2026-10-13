/* En minimal IFC4-fil för tester: två byggnadselement (en container 6,1 × 2,5 × 2,9 m och en trafo
   3,2 × 2,6 × 2,6 m) som extruderade rektanglar, placerade i IFC:s Z-upp-koordinater. Enheten kan vara meter eller
   millimeter — web-ifc ska ge samma resultat i meter. */

export function miniIfc({ enhet = "metre", extra = "" } = {}) {
  const mm = enhet === "mm";
  const s = mm ? 1000 : 1;
  const n = (v) => `${(v * s).toFixed(3)}`;
  return `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('mini.ifc','2026-10-12T10:00:00',('Test'),('ONE Nordic'),'x','x','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPERSON($,$,'Test',$,$,$,$,$);
#2=IFCORGANIZATION($,'ONE Nordic',$,$,$);
#3=IFCPERSONANDORGANIZATION(#1,#2,$);
#4=IFCAPPLICATION(#2,'1','Test','Test');
#5=IFCOWNERHISTORY(#3,#4,$,.ADDED.,$,#3,#4,1600000000);
#6=IFCDIRECTION((1.,0.,0.));
#7=IFCDIRECTION((0.,0.,1.));
#8=IFCCARTESIANPOINT((0.,0.,0.));
#9=IFCAXIS2PLACEMENT3D(#8,#7,#6);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#9,$);
#11=IFCSIUNIT(*,.LENGTHUNIT.,${mm ? ".MILLI." : "$"},.METRE.);
#12=IFCUNITASSIGNMENT((#11));
#13=IFCPROJECT('0YvctVUKr0kugbFTf53O9L',#5,'Testprojekt',$,$,$,$,(#10),#12);
#20=IFCLOCALPLACEMENT($,#9);
#21=IFCSITE('1YvctVUKr0kugbFTf53O9L',#5,'Tomt',$,$,#20,$,$,.ELEMENT.,$,$,$,$,$);
#22=IFCRELAGGREGATES('2YvctVUKr0kugbFTf53O9L',#5,$,$,#13,(#21));
#30=IFCCARTESIANPOINT((0.,0.));
#31=IFCDIRECTION((1.,0.));
#32=IFCAXIS2PLACEMENT2D(#30,#31);
#33=IFCRECTANGLEPROFILEDEF(.AREA.,$,#32,${n(6.1)},${n(2.5)});
#34=IFCAXIS2PLACEMENT3D(#8,#7,#6);
#35=IFCEXTRUDEDAREASOLID(#33,#34,#7,${n(2.9)});
#36=IFCSHAPEREPRESENTATION(#10,'Body','SweptSolid',(#35));
#37=IFCPRODUCTDEFINITIONSHAPE($,$,(#36));
#38=IFCCARTESIANPOINT((${n(10)},${n(4)},0.));
#39=IFCAXIS2PLACEMENT3D(#38,#7,#6);
#40=IFCLOCALPLACEMENT(#20,#39);
#41=IFCBUILDINGELEMENTPROXY('3YvctVUKr0kugbFTf53O9L',#5,'Container A',$,$,#40,#37,$,$);
#50=IFCCARTESIANPOINT((${n(20)},${n(4)},0.));
#51=IFCAXIS2PLACEMENT3D(#50,#7,#6);
#52=IFCLOCALPLACEMENT(#20,#51);
#53=IFCRECTANGLEPROFILEDEF(.AREA.,$,#32,${n(3.2)},${n(2.6)});
#54=IFCEXTRUDEDAREASOLID(#53,#34,#7,${n(2.6)});
#55=IFCSHAPEREPRESENTATION(#10,'Body','SweptSolid',(#54));
#56=IFCPRODUCTDEFINITIONSHAPE($,$,(#55));
#57=IFCBUILDINGELEMENTPROXY('4YvctVUKr0kugbFTf53O9L',#5,'Trafo B',$,$,#52,#56,$,$);
#60=IFCRELCONTAINEDINSPATIALSTRUCTURE('5YvctVUKr0kugbFTf53O9L',#5,$,$,(#41,#57),#21);
${extra}ENDSEC;
END-ISO-10303-21;
`;
}

/** Samma som miniIfc men utan några element med geometri. */
export const tomIfc = () =>
  miniIfc()
    .replace(/#41=.*\n/, "")
    .replace(/#57=.*\n/, "")
    .replace(/#60=.*\n/, "");
