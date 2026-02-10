import { Outlet } from "react-router-dom";

const PermissionsLayout = () => {
  return (
    <div className="page-container">
      <Outlet />
    </div>
  );
};

export default PermissionsLayout;
