import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button } from "@mui/material";

interface GenericResultDialogProps {
    isOpen: boolean;
    success: boolean | undefined;
    message: string | undefined;
    onClose: () => void;
    title?: string;
    actions?: React.ReactNode;
    children?: React.ReactNode;
}

const GenericResultDialog = ({ isOpen, success, message, onClose, title, actions, children }: GenericResultDialogProps) => {
    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            slotProps={{
                backdrop: { sx: { backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' } }
            }}
        >
            <DialogTitle sx={{ fontWeight: 700 }}>
                {title ? title : (success ? "Success" : "Error")}
            </DialogTitle>
            <DialogContent>
                {children ? children : <Typography variant="body2">{message}</Typography>}
            </DialogContent>
            <DialogActions>
                {actions ? actions : (
                    <Button onClick={onClose} variant="contained" sx={{ textTransform: 'none' }}>
                        OK
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default GenericResultDialog;
