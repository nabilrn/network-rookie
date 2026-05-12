import React, { useState } from 'react';
import type { Decision } from '../utils/simulationDecisionEngine';
import './DecisionCard.css';

export interface DecisionCardProps {
  decision: Decision;
  onSelectOption: (optionId: string) => void;
  isLoading?: boolean;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({ decision, onSelectOption, isLoading = false }) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const handleSelectOption = (optionId: string) => {
    if (!isLoading && !selectedOptionId) {
      setSelectedOptionId(optionId);
      onSelectOption(optionId);
    }
  };

  const selectedOption = decision.options.find((opt) => opt.id === selectedOptionId);

  return (
    <div className="decision-card">
      <div className="decision-header">
        <div className="decision-mode-badge">Step 2: Choose priority</div>
        <h3 className="decision-question">{decision.question}</h3>
      </div>

      <div className="decision-options">
        {decision.options.map((option) => (
          <button
            key={option.id}
            className={`decision-option ${selectedOptionId === option.id ? 'selected' : ''} ${option.id === decision.recommended ? 'recommended' : ''}`}
            onClick={() => handleSelectOption(option.id)}
            disabled={isLoading || selectedOptionId !== null}
            title={
              option.id === decision.recommended
                ? 'Recommended for a stable experience'
                : selectedOptionId === null
                  ? 'Choose this priority'
                  : 'Already selected'
            }
          >
            <div className="option-content">
              <div className="option-label">{option.label}</div>
              <div className="option-description">{option.description}</div>
              {option.id === decision.recommended && selectedOptionId === null && (
                <div className="option-hint">Recommended for a more balanced experience</div>
              )}
            </div>
          </button>
        ))}
      </div>

      {selectedOption && (
        <div className="decision-footer">
          <p className="decision-hint">
            <strong>Why this matters:</strong> {decision.why}
          </p>
          <p className="decision-loading">{isLoading ? 'Checking impact...' : 'Applied on globe.'}</p>
        </div>
      )}
    </div>
  );
};

DecisionCard.displayName = 'DecisionCard';
