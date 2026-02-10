import argparse
import socket
import uvicorn
import os

DEFAULT_PORT = 8000
DEFAULT_CONFIG = "config/config.yaml"


def is_port_available(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("0.0.0.0", port)) != 0


def main():
    parser = argparse.ArgumentParser(description="Run TanichAI Backend")
    parser.add_argument("--config", help="Path to config file", default=DEFAULT_CONFIG)
    parser.add_argument("--port", type=int, help="Port to run the server on")

    args = parser.parse_args()

    # Decide config
    config_path = args.config or DEFAULT_CONFIG
    os.environ["APP_CONFIG"] = config_path  

    # Decide port
    port = args.port if args.port else DEFAULT_PORT

    if not is_port_available(port):
        print(f"[WARN] Port {port} is already in use. Falling back to {DEFAULT_PORT}")
        port = DEFAULT_PORT

    print(f"[INFO] Using config: {config_path}")
    print(f"[INFO] Starting server on port {port}")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True, 
    )


if __name__ == "__main__":
    main()
