import logging
from core.config import load_config
import os 

cfg = load_config(os.getenv("APP_CONFIG"))

def get_logger(name: str = None):
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger  # already configured

    level = getattr(logging, cfg.log_level.upper(), logging.INFO)
    logger.setLevel(level)
    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s")

    # Console handler
    ch = logging.StreamHandler()
    ch.setLevel(level)
    ch.setFormatter(formatter)
    logger.addHandler(ch)

    # File handler (optional)
    try:
        fh = logging.FileHandler(cfg.log_file)
        fh.setLevel(level)
        fh.setFormatter(formatter)
        logger.addHandler(fh)
    except Exception:
        # ignore file handler errors (e.g., path not existing) but still continue
        pass

    return logger
