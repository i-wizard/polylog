# Setting up the AI tutor

The **Chat** tab (tutor and role-plays) uses **Ollama on your Mac**. One script on the Mac gives Ollama a temporary `https://` address, and you paste that address into the app. Everything else in the app works without any of this.

## One-time setup

1. Install the model, if you haven't already:

   ```sh
   ollama pull gemma3:4b
   ```

2. Install **cloudflared**, Cloudflare's free tunnel tool. No account is needed.

   ```sh
   mkdir -p ~/.local/bin && cd /tmp \
     && curl -fsSL -o cloudflared.tgz https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz \
     && tar -xzf cloudflared.tgz && mv cloudflared ~/.local/bin/ && rm cloudflared.tgz
   ```

   (`brew install cloudflared` also works, but on this Intel Mac brew may build it from source.)

## Each time you want to practise with AI

1. On the Mac, in the project folder, run:

   ```sh
   ./tools/start-ai.sh
   ```

   It does three things:
   - lets the app talk to Ollama, restarting Ollama the first time after a reboot;
   - opens the tunnel;
   - prints an address like `https://some-random-words.trycloudflare.com` and copies it to the clipboard.

2. On the iPhone, open the app → **Settings → AI tutor → Paste**. If your Mac and iPhone share an Apple ID, the copied address is already on the phone's clipboard; otherwise type it in. You should see ✅ Connected.

3. Keep the terminal window open while you practise. Press **Ctrl+C** to stop.

**The address changes every time the script starts.** When the app says it can't reach your Mac, run the script again and paste the new address.

## Good to know

- **Keep the Mac awake** while you practise: lid open, or run `caffeinate -d` in another terminal.
- **The first reply is slow.** It takes 20–30 seconds while the model loads. After that, role-play replies take about 5 seconds and tutor answers 15–45 seconds.
- **Privacy:** while the script runs, anyone who knows the random address could use your Ollama. Nobody else knows it, and it stops working when you press Ctrl+C.
- **Speaking practice:** add a **German keyboard** on the iPhone (Settings → General → Keyboard) and use its 🎤 dictation button in role-plays instead of typing.

## Developing on the Mac

`npm run dev` serves the app at `http://localhost:5173`. Ollama already allows that address, so in the app's Settings you can use `http://localhost:11434` directly, without the tunnel.
