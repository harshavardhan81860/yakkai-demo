import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#6C63FF', light: '#958FFF', dark: '#4A42D4' },
        secondary: { main: '#00D9FF', light: '#5CE6FF', dark: '#00A8C6' },
        background: { default: '#0A0E1A', paper: '#111827' },
        success: { main: '#10B981' },
        warning: { main: '#F59E0B' },
        error: { main: '#EF4444' },
        info: { main: '#3B82F6' },
        text: { primary: '#F3F4F6', secondary: '#9CA3AF' },
    },
    typography: {
        fontFamily: "'Inter', 'Roboto', -apple-system, sans-serif",
        h4: { fontWeight: 700, letterSpacing: '-0.02em' },
        h5: { fontWeight: 700, letterSpacing: '-0.01em' },
        h6: { fontWeight: 600 },
        subtitle1: { fontWeight: 500 },
        body2: { color: '#9CA3AF' },
    },
    shape: { borderRadius: 12 },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    background: 'linear-gradient(145deg, rgba(17,24,39,0.9) 0%, rgba(17,24,39,0.7) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    transition: 'all 0.3s ease',
                    '&:hover': { border: '1px solid rgba(108,99,255,0.3)', boxShadow: '0 12px 40px rgba(108,99,255,0.15)' },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: { textTransform: 'none', fontWeight: 600, borderRadius: 10, padding: '8px 20px' },
                contained: { boxShadow: '0 4px 14px rgba(108,99,255,0.4)' },
            },
        },
        MuiChip: {
            styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    background: 'linear-gradient(180deg, #0F1629 0%, #0A0E1A 100%)',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 10,
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                        '&:hover fieldset': { borderColor: 'rgba(108,99,255,0.5)' },
                    },
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: { borderBottom: '1px solid rgba(255,255,255,0.06)' },
                head: { fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    background: 'linear-gradient(145deg, #1a2235 0%, #111827 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 16,
                },
            },
        },
        MuiStepper: {
            styleOverrides: { root: { padding: '24px 0' } },
        },
    },
});

export default theme;
