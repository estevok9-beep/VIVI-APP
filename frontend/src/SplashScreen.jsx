import vivLogo from "./assets/viv-logo.png";
import "./SplashScreen.css";

export default function SplashScreen() {
  return (
    <main className="viv-splash" aria-label="Carregando VIV">
      <div className="viv-splash-glow" aria-hidden="true" />

      <div className="viv-splash-stage">
        <div className="viv-splash-orbit" aria-hidden="true">
          <span className="viv-splash-arc" />
          <span className="viv-splash-arc-glow" />
        </div>

        <div className="viv-splash-logo-wrap">
          <img className="viv-splash-logo" src={vivLogo} alt="VIV" />
        </div>
      </div>

      <p className="viv-splash-caption">INTELIGÊNCIA PARA SUAS FINANÇAS</p>
    </main>
  );
}
