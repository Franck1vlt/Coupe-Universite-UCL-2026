import React from "react";

type ScoreDisplayProps = {
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
};

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ teamA, teamB, scoreA, scoreB }) => (
  <div className="score-display">
    <div>
      <strong>{teamA}</strong> : {scoreA}
    </div>
    <div>
      <strong>{teamB}</strong> : {scoreB}
    </div>
  </div>
);

export default ScoreDisplay;
