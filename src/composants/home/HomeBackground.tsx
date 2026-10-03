import { u } from "./u";

// Fond de la maquette : photo pivotée de -90° (l'eau cyan se retrouve en haut),
// bande blanche diagonale, puis filigrane du mois. Les positions sont celles de
// la maquette (frame 393x852) exprimées en % de la scène ; les tailles en `u`.
export default function HomeBackground({
  monthName,
  monthNumber,
}: {
  monthName: string;
  monthNumber: string;
}) {
  const watermark =
    "absolute font-rodin-ub whitespace-nowrap text-p3r-gray -translate-x-1/2 -translate-y-1/2 -rotate-[38.67deg]";

  return (
    <>
      {/* <div
        className="absolute"
        style={{
          left: "-26.81%",
          top: "43.01%",
          width: u(971),
          height: u(1725.636),
          transform: "translate(-50%, -50%) rotate(-90deg)",
          backgroundImage: "url(/home/bg-photo.png)",
          backgroundSize: "100% 100%",
        }}
      /> */}
      <div
        className="absolute bg-white"
        style={{
          left: "118.23%",
          top: "45%",
          width: u(1289.034),
          height: u(200),
          transform: "translate(-50%, -50%) rotate(-41.57deg)",
        }}
      />
      <p
        className={watermark}
        style={{ left: "70.53%", top: "68%", fontSize: u(40) }}
      >
        {monthName}
      </p>
      <p
        className={watermark}
        style={{ left: "91.56%", top: "70%", fontSize: u(40) }}
      >
        {monthNumber}
      </p>
    </>
  );
}
