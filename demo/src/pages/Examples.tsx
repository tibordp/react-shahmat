import React from 'react';
import './Examples.css';

import StaticDiagram, {
  SOURCE as StaticDiagramSource,
  TITLE as StaticDiagramTitle,
  DESCRIPTION as StaticDiagramDescription,
} from '../examples/StaticDiagram';
import TwoPlayerBoard, {
  SOURCE as TwoPlayerBoardSource,
  TITLE as TwoPlayerBoardTitle,
  DESCRIPTION as TwoPlayerBoardDescription,
} from '../examples/TwoPlayerBoard';
import FlippedBoard, {
  SOURCE as FlippedBoardSource,
  TITLE as FlippedBoardTitle,
  DESCRIPTION as FlippedBoardDescription,
} from '../examples/FlippedBoard';
import CustomTheme, {
  SOURCE as CustomThemeSource,
  TITLE as CustomThemeTitle,
  DESCRIPTION as CustomThemeDescription,
} from '../examples/CustomTheme';
import PlayAgainstRandom, {
  SOURCE as PlayAgainstRandomSource,
  TITLE as PlayAgainstRandomTitle,
  DESCRIPTION as PlayAgainstRandomDescription,
} from '../examples/PlayAgainstRandom';
import PuzzleBoard, {
  SOURCE as PuzzleBoardSource,
  TITLE as PuzzleBoardTitle,
  DESCRIPTION as PuzzleBoardDescription,
} from '../examples/PuzzleBoard';
import ArrowsAndHighlights, {
  SOURCE as ArrowsAndHighlightsSource,
  TITLE as ArrowsAndHighlightsTitle,
  DESCRIPTION as ArrowsAndHighlightsDescription,
} from '../examples/ArrowsAndHighlights';
import Premoves, {
  SOURCE as PremovesSource,
  TITLE as PremovesTitle,
  DESCRIPTION as PremovesDescription,
} from '../examples/Premoves';
import ControlledBoard, {
  SOURCE as ControlledBoardSource,
  TITLE as ControlledBoardTitle,
  DESCRIPTION as ControlledBoardDescription,
} from '../examples/ControlledBoard';
import HistoryNavigation, {
  SOURCE as HistoryNavigationSource,
  TITLE as HistoryNavigationTitle,
  DESCRIPTION as HistoryNavigationDescription,
} from '../examples/HistoryNavigation';
import CustomPieces, {
  SOURCE as CustomPiecesSource,
  TITLE as CustomPiecesTitle,
  DESCRIPTION as CustomPiecesDescription,
} from '../examples/CustomPieces';

interface ExampleEntry {
  component: React.ComponentType;
  source: string;
  title: string;
  description: string;
}

const EXAMPLES: ExampleEntry[] = [
  {
    component: StaticDiagram,
    source: StaticDiagramSource,
    title: StaticDiagramTitle,
    description: StaticDiagramDescription,
  },
  {
    component: TwoPlayerBoard,
    source: TwoPlayerBoardSource,
    title: TwoPlayerBoardTitle,
    description: TwoPlayerBoardDescription,
  },
  {
    component: FlippedBoard,
    source: FlippedBoardSource,
    title: FlippedBoardTitle,
    description: FlippedBoardDescription,
  },
  {
    component: CustomTheme,
    source: CustomThemeSource,
    title: CustomThemeTitle,
    description: CustomThemeDescription,
  },
  {
    component: CustomPieces,
    source: CustomPiecesSource,
    title: CustomPiecesTitle,
    description: CustomPiecesDescription,
  },
  {
    component: PlayAgainstRandom,
    source: PlayAgainstRandomSource,
    title: PlayAgainstRandomTitle,
    description: PlayAgainstRandomDescription,
  },
  {
    component: PuzzleBoard,
    source: PuzzleBoardSource,
    title: PuzzleBoardTitle,
    description: PuzzleBoardDescription,
  },
  {
    component: ArrowsAndHighlights,
    source: ArrowsAndHighlightsSource,
    title: ArrowsAndHighlightsTitle,
    description: ArrowsAndHighlightsDescription,
  },
  {
    component: Premoves,
    source: PremovesSource,
    title: PremovesTitle,
    description: PremovesDescription,
  },
  {
    component: ControlledBoard,
    source: ControlledBoardSource,
    title: ControlledBoardTitle,
    description: ControlledBoardDescription,
  },
  {
    component: HistoryNavigation,
    source: HistoryNavigationSource,
    title: HistoryNavigationTitle,
    description: HistoryNavigationDescription,
  },
];

function ExampleCard({ entry }: { entry: ExampleEntry }) {
  const [showCode, setShowCode] = React.useState(false);
  const Component = entry.component;

  return (
    <div className='example-card'>
      <div className='example-header'>
        <h2 className='example-title'>{entry.title}</h2>
        <p className='example-description'>{entry.description}</p>
      </div>
      <div className='example-content'>
        <div className='example-board'>
          <Component />
        </div>
        <div className='example-code-section'>
          <button
            className='toggle-code-button'
            onClick={() => setShowCode(!showCode)}
          >
            {showCode ? 'Hide Code' : 'Show Code'}
          </button>
          {showCode && (
            <pre className='example-code'>
              <code>{entry.source}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Examples() {
  return (
    <div className='examples-page'>
      <div className='hero-section'>
        <h1 className='hero-title'>react-shahmat</h1>
        <p className='hero-tagline'>
          A controlled React chess board component with animations, sound
          effects, premoves, and a built-in game logic.
        </p>
        <div className='hero-install'>
          <code>npm install react-shahmat</code>
        </div>
        <div className='hero-links'>
          <a
            href='https://github.com/tibordp/react-shahmat'
            target='_blank'
            rel='noopener noreferrer'
            className='hero-link'
          >
            GitHub
          </a>
          <a
            href='https://www.npmjs.com/package/react-shahmat'
            target='_blank'
            rel='noopener noreferrer'
            className='hero-link'
          >
            npm
          </a>
        </div>
      </div>
      <div className='examples-header'>
        <h2>Examples</h2>
        <p>Interactive examples demonstrating the features of react-shahmat.</p>
      </div>
      <div className='examples-grid'>
        {EXAMPLES.map((entry, i) => (
          <ExampleCard key={i} entry={entry} />
        ))}
      </div>
    </div>
  );
}
