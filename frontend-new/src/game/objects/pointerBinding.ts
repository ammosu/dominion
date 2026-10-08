import Phaser from 'phaser';

const LONG_PRESS_MS = 450;

/**
 * Mouse: press acts, hovering previews. Touch has no hover, so a short tap
 * acts and press-and-hold previews the card (until the finger lifts)
 * without acting.
 */
export function bindCardPointer(
  target: Phaser.GameObjects.Container,
  onTap: () => void,
  onPreview: (on: boolean) => void,
) {
  const scene = target.scene;
  let timer: Phaser.Time.TimerEvent | null = null;
  let previewing = false;

  const endPreview = () => {
    timer?.remove();
    timer = null;
    if (previewing) {
      previewing = false;
      onPreview(false);
    }
  };

  target.on('pointerover', (pointer: Phaser.Input.Pointer) => {
    if (!pointer.wasTouch) onPreview(true);
  });
  target.on('pointerout', (pointer: Phaser.Input.Pointer) => {
    if (!pointer.wasTouch) onPreview(false);
  });
  target.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    if (!pointer.wasTouch) {
      onTap();
      return;
    }
    endPreview();
    timer = scene.time.delayedCall(LONG_PRESS_MS, () => {
      previewing = true;
      onPreview(true);
    });
  });
  target.on('pointerup', (pointer: Phaser.Input.Pointer) => {
    if (pointer.wasTouch && pointer.getDuration() < LONG_PRESS_MS) onTap();
  });

  // The finger may lift anywhere (or the card may be rebuilt meanwhile).
  scene.input.on('pointerup', endPreview);
  target.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.input.off('pointerup', endPreview);
    timer?.remove();
  });
}
