import { t } from '../../electron/i18n';
// Camera position check: from ~5 s of checks with the user sitting normally and both hands
// resting on the desk, say whether the camera sees what the rules need. Pure, unit-tested.

export type CameraStats = {
  faceShare: number;      // share of checks with a face found (0-1)
  faceWidth: number;      // average face width as a share of the frame width
  faceY: number;          // average face centre height (0 = top, 1 = bottom)
  handsShare: number;     // share of checks with at least one hand found
  brightness: number;     // average frame brightness, 0-255
  faceBrightness: number; // average brightness inside the face, 0-255
};

export type Advice = { ok: boolean; text: string };

export function cameraAdvice(s: CameraStats): Advice[] {
  const out: Advice[] = [];
  out.push(s.faceShare >= 0.9
    ? { ok: true, text: t('Your face is visible.') }
    : { ok: false, text: t('Your face is often not found. Point the camera at your face.') });
  if (s.faceShare > 0) {
    out.push(s.faceWidth < 0.08
      ? { ok: false, text: t('You are far from the camera. Move it closer, or sit closer.') }
      : s.faceWidth > 0.3
        ? { ok: false, text: t('The camera is too close. Move it back so your hands and desk fit in the picture.') }
        : { ok: true, text: t('Distance is good.') });
    out.push(s.faceY > 0.5
      ? { ok: false, text: t('Your face is in the lower half of the picture. Tilt the camera down a little less, or raise it, so your face is in the top half and the desk in the bottom half.') }
      : s.faceY < 0.15
        ? { ok: false, text: t('Your face is at the very top edge. Tilt the camera up a little.') }
        : { ok: true, text: t('Face is in the top half, desk below: good.') });
  }
  out.push(s.handsShare >= 0.6
    ? { ok: true, text: t('Your hands on the desk are visible.') }
    : { ok: false, text: t('Your hands on the desk are not visible. Tilt the camera down or move it further back. Phone and writing detection need your hands in view.') });
  out.push(s.brightness < 60
    ? { ok: false, text: t('The picture is dark. Turn on a light in front of you.') }
    : s.faceShare > 0 && s.faceBrightness < s.brightness - 30
      ? { ok: false, text: t('The light is behind you, so your face is dark. Face the window or lamp instead.') }
      : { ok: true, text: t('Lighting is good.') });
  return out;
}

// Why the camera did not open, in plain words, from the browser's error name.
// "Busy" is the common one: another app (a video call, a browser tab) holds the camera.
export function cameraProblem(name: string): { title: string; advice: string } {
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError')
    return { title: t('Camera is busy: another app is using it'), advice: t('Close the other app (a video call or a browser tab), then try again.') };
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return { title: t('Camera is blocked'), advice: t('Allow camera access in Windows Settings → Privacy & security → Camera, then try again.') };
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return { title: t('No camera found'), advice: t('Plug in a camera, or pick another one in Settings, then try again.') };
  return { title: t('The camera did not start'), advice: t('Try again. If it keeps failing, restart Desk Watch.') };
}
