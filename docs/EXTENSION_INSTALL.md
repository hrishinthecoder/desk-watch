# Installing the Desk Watch blocker (Chrome and Edge)

The extension tells the Desk Watch app which site is open in your browser, so Blocker mode can
block distracting sites during a study session. It talks only to the app on your own computer
(`http://127.0.0.1:47615`), never to the internet.

## Install (once)

1. Open Desk Watch → **Settings → Blocker mode** and click **Open extension folder**.
2. In the browser, open the extensions page:
   - Chrome: type `chrome://extensions` in the address bar
   - Edge: type `edge://extensions`
3. Switch on **Developer mode** (top right in Chrome, left side in Edge).
4. Click **Load unpacked** and choose the `extension` folder that opened in step 1.
5. Desk Watch (it must be open) asks **"Connect Chrome?"**. Click **Allow**. That's it: no code to type.
   Each browser gets its own secret key; you can disconnect it any time in Settings → Blocker mode.

If the question does not appear, click the extension's icon in the toolbar → **Connect to Desk Watch**,
or use the **pairing code** from Settings → Blocker mode under "Use a pairing code instead".

## Use

On the Study screen, tick **Blocker mode** before you press Start. During the session:

- a site on your **Blocked sites** list opens a "Back to work" page instead;
- a program on your **Blocked apps** list rings the alarm and brings Desk Watch to the front
  (the program is not closed);
- time per site and per program is added to your session report.

Nothing is blocked during a break or a pause, or outside sessions.

## Known limits

- Firefox is not supported (the alarm still warns you when Firefox is in front without the extension).
- Private / incognito windows: open the extension's **Details** and switch on **Allow in incognito**.
- You can switch the extension off at any time. Desk Watch then warns you during a Blocker mode session
  when a browser is in front and the extension has been silent for 90 seconds.
- If you clicked **Don't allow** by mistake, click the extension's icon → **Connect to Desk Watch**.
- Only the program's name is read, never window titles, and nothing on the screen is recorded.
