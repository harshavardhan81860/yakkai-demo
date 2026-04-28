import { useNavigate } from "react-router-dom";
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography, Stack } from "@mui/material";
import { ChevronRight, Business } from "@mui/icons-material";

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface Props {
  items: BreadcrumbItem[];
}

const Breadcrumbs = ({ items }: Props) => {
  const navigate = useNavigate();

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
      <MuiBreadcrumbs separator={<ChevronRight fontSize="small" sx={{ color: 'text.disabled' }} />}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;

          // If it's the last item, or has no path, render as active text
          if (isLast || !item.path) {
            return (
              <Typography
                key={index}
                color="text.primary"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem', fontWeight: 700 }}
              >
                {isFirst && <Business sx={{ fontSize: 16 }} />}
                {item.label}
              </Typography>
            );
          }

          // Otherwise, render a clickable link
          return (
            <Link
              key={index}
              underline="hover"
              color="inherit"
              onClick={() => navigate(item.path!)}
              sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem' }}
            >
              {isFirst && <Business sx={{ fontSize: 16 }} />}
              {item.label}
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Stack>
  );
};

export default Breadcrumbs;
