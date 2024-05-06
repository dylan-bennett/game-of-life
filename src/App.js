import React, { Component } from "react";

const totalBoardRows = 40;
const totalBoardCols = 60;

const newBoardStatus = (cellStatus = () => Math.random() < 0.3) => {
  /*
  Returns a 2D array of boolean values to represent the cells.
  */
  const grid = [];
  for (let r = 0; r < totalBoardRows; r++) {
    grid[r] = [];
    for (let c = 0; c < totalBoardCols; c++) {
      grid[r][c] = cellStatus();
    }
  }

  return grid;
};

const BoardGrid = ({ boardStatus, onToggleCellStatus }) => {
  const handleClick = (r, c) => onToggleCellStatus(r, c);

  const tr = [];
  for (let r = 0; r < totalBoardRows; r++) {
    const td = [];
    for (let c = 0; c < totalBoardCols; c++) {
      td.push(
        <td
          key={`${r},${c}`}
          className={boardStatus[r][c] ? 'alive' : 'dead'}
          onClick={() => handleClick(r, c)}
        />
      );
    }
    tr.push(<tr key={r}>{td}</tr>);
  }

  return <table><tbody>{tr}</tbody></table>;
};

const Slider = ({ speed, onSpeedChange }) => {
  const handleChange = e => onSpeedChange(e.target.value);

  return (
    <input
      type="range"
      min="50"
      max="1000"
      step="50"
      value={speed}
      onChange={handleChange}
    />
  );
};

class App extends Component {
  state = {
    boardStatus: newBoardStatus(),
    generation: 0,
    isGameRunning: false,
    speed: 500
  };

  // Start/Stop button
  runStopButton = () => {
    return this.state.isGameRunning ?
      <button type="button" onClick={this.handleStop}>Stop</button> :
      <button type="button" onClick={this.handleRun}>Start</button>;
  }

  // Clear Board button action
  handleClearBoard = () => {
    this.setState({
      boardStatus: newBoardStatus(() => false),
      generation: 0
    });
  };

  // New Board button action
  handleNewBoard = () => {
    this.setState({
      boardStatus: newBoardStatus(),
      generation: 0
    });
  };

  // Toggle a cell's status and update the board's status as a result
  handleToggleCellStatus = (r, c) => {
    const toggleBoardStatus = prevState => {
      const clonedBoardStatus = JSON.parse(JSON.stringify(prevState.boardStatus));
      clonedBoardStatus[r][c] = !clonedBoardStatus[r][c];
      return clonedBoardStatus;
    };

    this.setState(prevState => ({
      boardStatus: toggleBoardStatus(prevState)
    }));
  };

  // Move the board forward one step by following the rules defined in Conway's Game of Life
  handleStep = () => {
    const nextStep = prevState => {
      // current board status
      const boardStatus = prevState.boardStatus;

      // updated board status
      const clonedBoardStatus = JSON.parse(JSON.stringify(prevState.boardStatus));

      // Return the number of True neighbours of a given cell
      const amountTrueNeighbours = (r, c) => {
        const neighbours = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]];
        return neighbours.reduce((trueNeighbours, neighbour) => {
          const currRow = r + neighbour[0];
          const currCol = c + neighbour[1];

          const isNeighbourOnBoard = (currRow >= 0 && currRow < totalBoardRows && currCol >= 0 && currCol < totalBoardCols);

          // if (isNeighbourOnBoard && boardStatus[currRow][currCol]) {
          //   return trueNeighbours + 1;
          // } else {
          //   return trueNeighbours;
          // }

          return trueNeighbours + (isNeighbourOnBoard && boardStatus[currRow][currCol]);

        }, 0);
      };

      // Run through each cell and apply GoL rules for each cell
      for (let r = 0; r < totalBoardRows; r++) {
        for (let c = 0; c < totalBoardCols; c++) {
          const numTrueNeighbours = amountTrueNeighbours(r, c);

          if (boardStatus[r][c] === false) {
            if (numTrueNeighbours === 3) {
              clonedBoardStatus[r][c] = true;
            } 
          } else {
            if (numTrueNeighbours < 2 || numTrueNeighbours > 3) {
              clonedBoardStatus[r][c] = false;
            }
          }
        }
      }

      return clonedBoardStatus;
    };

    this.setState(prevState => ({
      boardStatus: nextStep(prevState),
      generation: prevState.generation + 1
    }));
  };

  handleSpeedChange = newSpeed => {
    this.setState({
      speed: newSpeed
    });
  };

  handleRun = () => {
    this.setState({isGameRunning: true});
  };

  handleStop = () => {
    this.setState({isGameRunning: false});
  };

  componentDidUpdate(prevProps, prevState) {
    const { isGameRunning, speed } = this.state;
    const speedChanged = prevState.speed !== speed;
    const gameStarted = !prevState.isGameRunning && isGameRunning;
    const gameStopped = prevState.isGameRunning && !isGameRunning;

    // if we changed the speed or stopped the game, clear the timer
    if ((isGameRunning && speedChanged) || gameStopped) {
      clearInterval(this.timerID);
    }

    // if we changed the speed or started the game, set the new timer
    // to go forward a step at the speed's interval
    if ((isGameRunning && speedChanged) || gameStarted) {
      this.timerID = setInterval(() => {
        this.handleStep();
      }, speed);
    }
  }

  render() {
    const { boardStatus, isGameRunning, generation, speed } = this.state;

    return (
      <div>
        <h1>Dylan's Game of Life</h1>
        <BoardGrid boardStatus={boardStatus} onToggleCellStatus={this.handleToggleCellStatus} />
        <div className="flexRow upperControls">
          <span>
            {"+ "}
            <Slider speed={speed} onSpeedChange={this.handleSpeedChange} />
            {" -"}
          </span>
          {`Generation: ${generation}`}
        </div>
        <div className="flexRow lowerControls">
          {this.runStopButton()}
          <button type="button" disabled={isGameRunning} onClick={this.handleStep}>Step</button>
          <button type="button" onClick={this.handleClearBoard}>Clear Board</button>
          <button type="button" onClick={this.handleNewBoard}>New Board</button>
        </div>
      </div>
    );
  }
}

export default App;