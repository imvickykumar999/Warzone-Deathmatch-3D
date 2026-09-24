# Warzone Deathmatch 3D

A browser-based 3D multiplayer deathmatch game. The browser renders the arena and sends gameplay packets through a WebSocket bridge. The bridge forwards those packets to the Python TCP game server.

## How The Pieces Connect

```text
Browser  ->  WebSocket bridge (client.py, port 8765)  ->  TCP game server (server.py, port 8888)
					  static web server (client.py, port 8080)
```

- `server.py` hosts the multiplayer game on TCP port `8888`.
- `client.py` serves the browser files on HTTP port `8080` and provides the browser-to-TCP bridge on WebSocket port `8765`.
- `index.html`, `game.js`, `style.css`, `three.module.js`, and `assets/` are loaded by the browser.
- The browser launcher asks for the game server address and port. Its bridge address normally stays at `ws://<machine-serving-the-page>:8765`.

## Requirements

- Python 3.10 or newer
- A modern browser with WebGL, Pointer Lock, and WebSocket support
- Python packages from `requirements.txt`

Install the dependency once from the project directory:

```powershell
python -m pip install -r requirements.txt
```

On Windows, use the same Python executable to install and run the project. For example:

```powershell
C:\Users\surface\AppData\Local\Programs\Python\Python313\python.exe -m pip install -r requirements.txt
```

## Scenario 1: Play Locally On One Computer

Use this for a private game where the server and browser are on the same computer.

1. Open PowerShell in the project directory.
2. Start the TCP game server:

	```powershell
	python server.py
	```

3. Leave that window running. Open a second PowerShell window in the same directory and start the browser bridge:

	```powershell
	python client.py
	```

4. Open [http://localhost:8080](http://localhost:8080) in your browser.
5. Enter a player name, leave the server as `127.0.0.1`, leave the port as `8888`, and select **Play**.
6. To add another local player, open the game in another browser tab or window and choose a different name.

Stop either process with `Ctrl+C`.

## Scenario 2: Play Over A Local Network

Use this when the host and players are on the same Wi-Fi or LAN.

### On The Host Computer

1. Start both processes on the host:

	```powershell
	python server.py
	python client.py
	```

	Keep each command in its own terminal.

2. Allow inbound TCP traffic for ports `8080`, `8765`, and `8888` in the host firewall if Windows asks.
3. Find the host's LAN IPv4 address. `client.py` prints a line such as `LAN Web URL: http://192.168.1.4:8080`.

### On Each LAN Player Computer

1. Open the printed LAN Web URL, for example [http://192.168.1.4:8080](http://192.168.1.4:8080).
2. In the launcher, set:
	- **Server address:** the host LAN IP, such as `192.168.1.4`
	- **Port:** `8888`
	- **WebSocket Bridge:** `ws://192.168.1.4:8765`
3. Enter a unique player name and select **Play**.

The host must keep both `server.py` and `client.py` running. The LAN address can change when the router assigns a new DHCP address.

## Scenario 3: Play Through Tailscale

Use this when players are not on the same physical network but all devices are connected to the same Tailscale tailnet.

### On The Host Computer

1. Install and sign in to Tailscale on the host and every player computer.
2. Start `server.py` and `client.py` on the host.
3. Use the Tailscale Web URL printed by `client.py`, for example `http://100.121.132.98:8080`.
4. Allow ports `8080`, `8765`, and `8888` through the host firewall if required.

### On Each Player Computer

1. Open the host's Tailscale Web URL.
2. Set:
	- **Server address:** the host's Tailscale IP, such as `100.121.132.98`
	- **Port:** `8888`
	- **WebSocket Bridge:** `ws://100.121.132.98:8765`
3. Enter a unique name and select **Play**.

The Tailscale IP shown in the launcher is an example and may differ. Always use the address printed by the host's `client.py` process.

## Scenario 4: Use The Online Server `game.24x7stream.shop`

Use this when `server.py` is already running on the deployed game server at `game.24x7stream.shop`.

Each player still needs a browser bridge. The simplest setup is for every player to run `client.py` on their own computer:

1. Download or clone this project.
2. Install the dependency:

	```powershell
	python -m pip install -r requirements.txt
	```

3. Start the local bridge and web server:

	```powershell
	python client.py
	```

4. Open [http://localhost:8080](http://localhost:8080).
5. In the launcher, set:
	- **Server address:** `game.24x7stream.shop`
	- **Port:** `8888`
	- **WebSocket Bridge:** leave the default `ws://localhost:8765`
6. Enter a unique name and select **Play**.

In this arrangement, the local `client.py` bridge connects outbound to `game.24x7stream.shop:8888`; port `8888` does not need to be exposed on the player's computer. The deployed host must allow inbound TCP `8888`, and its DNS record must point to the server's public IP.

If the deployed server also hosts the browser files and bridge publicly, use the URL and WebSocket bridge address supplied by that deployment instead. The bridge must be reachable over WebSocket, and the browser page must be served from a trusted origin that can access it.

## Controls

| Action | Control |
| --- | --- |
| Move | `W`, `A`, `S`, `D` or arrow keys |
| Aim | Mouse while the pointer is locked |
| Fire | Left mouse button |
| Zoom / aim down sights | Tap `C` to toggle, or hold it briefly |
| Jump | `Space` |
| Reload | `R` or `E` |
| Release mouse cursor | `Esc` |
| Respawn after death | `R`, `Space`, `Enter`, or the **RESPAWN** button |
| Toggle music | Music button in the top-right corner |
| Toggle fullscreen | **Fullscreen** button in the top-right corner |

Click the game canvas to restore mouse lock after pressing `Esc`.

## Troubleshooting

### The browser says “Connection error”

- Confirm `client.py` is still running and listening on WebSocket port `8765`.
- Confirm the **WebSocket Bridge** value points to the machine running `client.py`.
- Confirm the **Server address** points to the machine running `server.py`.
- Confirm the TCP port is `8888`.

### The browser page does not load

- Confirm `client.py` is running.
- Open the correct URL: `http://localhost:8080` locally, or the LAN/Tailscale URL printed by `client.py`.
- Check that port `8080` is allowed through the host firewall.

### The bridge cannot connect to the TCP server

- Start `server.py` before trying to play.
- Check that the server is listening on TCP port `8888`.
- For LAN or Tailscale play, use the server host's LAN or Tailscale IP rather than `127.0.0.1`.
- For the online server, verify that `game.24x7stream.shop` resolves to the deployed host and that TCP `8888` is allowed by the cloud firewall/security group.

### The game starts but the mouse does not aim

Click inside the game canvas. The browser requires a user gesture before it grants Pointer Lock.

## Project Files

| File | Purpose |
| --- | --- |
| `server.py` | TCP multiplayer game server |
| `client.py` | Static web server and WebSocket-to-TCP bridge |
| `index.html` | Browser launcher and game HUD |
| `game.js` | Three.js game client, movement, shooting, and networking |
| `style.css` | Launcher and in-game styling |
| `requirements.txt` | Python dependency list |
| `assets/` | Textures, music, and sound effects |

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
