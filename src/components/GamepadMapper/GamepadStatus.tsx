import { useGamepadStore } from '../../store/gamepadStore';
import { useUiStore } from '../../store/uiStore';

export function GamepadStatus() {
  const isConnected = useGamepadStore((s) => s.isConnected);
  const gamepadId = useGamepadStore((s) => s.gamepadId);
  const setIsGamepadMapperOpen = useUiStore((s) => s.setIsGamepadMapperOpen);

  const label = isConnected
    ? `🎮 ${gamepadId ? gamepadId.slice(0, 20) : 'CONTROLLER'}`
    : '🎮 NO PAD';

  return (
    <button
      className={`btn emu-toolbar__btn gamepad-status-btn ${isConnected ? 'emu-toolbar__btn--active' : ''}`}
      onClick={() => setIsGamepadMapperOpen(true)}
      title={isConnected ? `Controller connected: ${gamepadId}` : 'No controller detected — click to configure'}
    >
      {label}
    </button>
  );
}
