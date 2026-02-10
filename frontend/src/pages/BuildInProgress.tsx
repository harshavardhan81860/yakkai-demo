import React from "react";
import { Box, Typography, Card, Avatar } from "@mui/material";
import { Construction, HourglassTop } from "@mui/icons-material";

interface BuildInProgressProps {
  title?: string;
  message?: string;
}

const BuildInProgress: React.FC<BuildInProgressProps> = ({
  title = "Module Under Construction",
  message = "Our engineers are currently forging this component. Stay tuned!",
}) => {
  return (
    <Box
      sx={{
        height: "70vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        p: 3,
      }}
    >
      <Box sx={{ position: 'relative', mb: 4 }}>
        <Avatar
          sx={{
            width: 120,
            height: 120,
            bgcolor: 'rgba(108,99,255,0.05)',
            color: '#6C63FF',
            border: '2px dashed rgba(108,99,255,0.2)',
          }}
        >
          <Construction sx={{ fontSize: 60 }} />
        </Avatar>
        <Box
          sx={{
            position: 'absolute',
            bottom: -10,
            right: -10,
            bgcolor: '#00D9FF',
            borderRadius: '50%',
            p: 1,
            display: 'flex',
            boxShadow: '0 4px 10px rgba(0,217,255,0.3)'
          }}
        >
          <HourglassTop sx={{ fontSize: 20, color: '#000' }} />
        </Box>
      </Box>

      <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mb: 4 }}>
        {message}
      </Typography>

      <Card
        variant="outlined"
        sx={{
          py: 2,
          px: 4,
          borderRadius: 4,
          bgcolor: 'rgba(255,255,255,0.02)',
          borderStyle: 'dashed',
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <Typography variant="button" sx={{ letterSpacing: 2, fontWeight: 700, opacity: 0.6 }}>
          ENGINEERING IN PROGRESS
        </Typography>
      </Card>
    </Box>
  );
};

export default BuildInProgress;
