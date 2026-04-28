type Props = {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmModal = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: Props) => {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3>{title}</h3>
        <p>{message}</p>

        <div className="modal-actions">
          <button className="modal-ok" onClick={onConfirm}>
            OK
          </button>
          <button className="modal-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
