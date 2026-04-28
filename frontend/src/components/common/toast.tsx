import "../../../styles/toast.css";

type ToastProps = {
  message: string | null;
  type?: "success" | "error";
  onClose: () => void;
};

const Toast = ({ message, type = "success", onClose }: ToastProps) => {
  if (!message) return null;

  return (
    <div className={`toast ${type}`}>
      <span>{message}</span>
      <button onClick={onClose}>✕</button>
    </div>
  );
};

export default Toast;
