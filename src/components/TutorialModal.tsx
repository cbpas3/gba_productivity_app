import { useState } from 'react';
import { useUiStore } from '../store/uiStore';

export function TutorialModal() {
  const hasSeenTutorial = useUiStore((s) => s.hasSeenTutorial);
  const setHasSeenTutorial = useUiStore((s) => s.setHasSeenTutorial);
  const [neverShow, setNeverShow] = useState(false);
  const [isVisible, setIsVisible] = useState(!hasSeenTutorial);

  if (!isVisible) return null;

  const handleClose = () => {
    if (neverShow) {
      setHasSeenTutorial(true);
    }
    setIsVisible(false);
  };

  return (
    <div className="tutorial-modal-overlay">
      <div className="tutorial-modal card pixel-border pixel-border--glow animate-fade-in-up">
        <h2 className="tutorial-modal__title glow-text--cyan">WELCOME, TRAINER!</h2>
        <hr className="pixel-divider" />
        
        <div className="tutorial-modal__content">
          <p>Here is how to power up your productivity:</p>
          <ul className="tutorial-modal__list">
            <li><strong>1. Load ROM & Save:</strong> Use the EMULATOR section to load your Gen III Pokémon game and its `.sav` file.</li>
            <li><strong>2. Add Quests:</strong> Add real-life tasks to your QUEST LOG with different priorities.</li>
            <li><strong>3. Level Up:</strong> Mark tasks as DONE to pool EXP rewards. (Does not interrupt your game!)</li>
            <li><strong>4. Claim Rewards:</strong> Save your game in the emulator, then click "CLAIM REWARDS" to apply the EXP and reload your save.</li>
          </ul>
        </div>
        
        <div className="tutorial-modal__footer">
          <label className="tutorial-modal__checkbox-label">
            <input 
              type="checkbox" 
              className="tutorial-modal__checkbox" 
              checked={neverShow} 
              onChange={(e) => setNeverShow(e.target.checked)} 
            />
            <span className="tutorial-modal__checkbox-text">Never show this again</span>
          </label>
          <button className="btn btn--primary" onClick={handleClose}>
            GET STARTED
          </button>
        </div>
      </div>
      <style>{`
        .tutorial-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(26, 10, 46, 0.85);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
          backdrop-filter: blur(4px);
        }
        .tutorial-modal {
          max-width: 500px;
          width: 100%;
          background: var(--color-surface-card);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .tutorial-modal__title {
          font-family: var(--font-pixel);
          font-size: 0.8rem;
          text-align: center;
          line-height: 1.4;
        }
        .tutorial-modal__content p {
          font-family: var(--font-retro);
          color: var(--color-text-primary);
          margin-bottom: var(--space-2);
          font-size: 1.3rem;
        }
        .tutorial-modal__list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .tutorial-modal__list li {
          font-family: var(--font-retro);
          font-size: 1.1rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
          position: relative;
          padding-left: var(--space-3);
          border-left: 2px solid var(--color-purple-main);
        }
        .tutorial-modal__list strong {
          color: var(--color-accent-yellow);
        }
        .tutorial-modal__footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: var(--space-2);
          padding-top: var(--space-3);
          border-top: 1px solid var(--color-border-subtle);
        }
        .tutorial-modal__checkbox-label {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          cursor: pointer;
        }
        .tutorial-modal__checkbox {
          width: 16px;
          height: 16px;
          accent-color: var(--color-purple-main);
          cursor: pointer;
        }
        .tutorial-modal__checkbox-text {
          font-family: var(--font-pixel);
          font-size: 0.45rem;
          color: var(--color-text-muted);
          letter-spacing: 0.05em;
        }
        @media (max-width: 768px) {
          .tutorial-modal__footer {
            flex-direction: column;
            gap: var(--space-4);
          }
          .tutorial-modal__footer .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
