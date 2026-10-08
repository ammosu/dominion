import Phaser from 'phaser';
import { canHover } from '../../utils/hover';

const LONG_PRESS_MS = 450;

/**
 * Mouse: press acts, hovering previews. Touch has no hover, so a short tap
 * acts and press-and-hold previews the card (until the finger lifts)
 * without acting.
 *
 * Phaser also listens for touches on the whole window and hit-tests them
 * against the table, so a tap on a dialog above the canvas would reach the
 * card beneath it: only presses and releases on the canvas itself count.
 */
export function bindCardPointer(
  target: Phaser.GameObjects.Container,
  onTap: (touch: boolean) => void,
  onPreview: (on: boolean) => void,
) {
  const scene = target.scene;
  let timer: Phaser.Time.TimerEvent | null = null;
  let previewing = false;
  const onCanvas = (element: unknown) => element === scene.game.canvas;

  const endPreview = () => {
    timer?.remove();
    timer = null;
    if (previewing) {
      previewing = false;
      onPreview(false);
    }
  };

  // iOS follows a tap with mousedown/mouseup on whatever was tapped; Phaser
  // takes those from the window and would "hover" the card under a dialog.
  target.on('pointerover', (pointer: Phaser.Input.Pointer) => {
    if (!pointer.wasTouch && canHover() && onCanvas(pointer.event?.target)) onPreview(true);
  });
  target.on('pointerout', (pointer: Phaser.Input.Pointer) => {
    if (!pointer.wasTouch) onPreview(false);
  });
  target.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    if (!onCanvas(pointer.downElement)) return;
    if (!pointer.wasTouch) {
      onTap(false);
      return;
    }
    endPreview();
    timer = scene.time.delayedCall(LONG_PRESS_MS, () => {
      previewing = true;
      onPreview(true);
    });
  });
  target.on('pointerup', (pointer: Phaser.Input.Pointer) => {
    if (!pointer.wasTouch || !onCanvas(pointer.downElement) || !onCanvas(pointer.upElement)) return;
    if (pointer.getDuration() < LONG_PRESS_MS) onTap(true);
  });

  // The finger may lift anywhere (or the card may be rebuilt meanwhile).
  scene.input.on('pointerup', endPreview);
  target.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.input.off('pointerup', endPreview);
    timer?.remove();
  });
}
