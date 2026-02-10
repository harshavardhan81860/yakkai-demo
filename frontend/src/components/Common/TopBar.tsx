import "./../../styles/topbar.css";

const TopBar = () => {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Tenant / Cloud info will come here later */}
      </div>

      <div className="topbar-right">
        <button className="icon-btn">🔔</button>
      </div>
    </header>
  );
};

export default TopBar;
