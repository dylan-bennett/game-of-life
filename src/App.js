import React, { Component } from "react";

const totalBoardRows = 6;
const totalBoardCols = 6;
const numCellStates = 2;

const newBoardStatus = (cellState = () => Math.round(Math.random() * numCellStates)) => {
  /*
  Returns a 2D array of boolean values to represent the cells.
  */
  const grid = [];
  for (let r = 0; r < totalBoardRows; r++) {
    grid[r] = [];
    for (let c = 0; c < totalBoardCols; c++) {
      grid[r][c] = {
        state: cellState(),
      };
    }
  }

  return grid;
};

const BoardGrid = ({ boardStatus, onIncrementCellState }) => {
  const handleClick = (r, c) => onIncrementCellState(r, c);

  const tr = [];
  for (let r = 0; r < totalBoardRows; r++) {
    const td = [];
    for (let c = 0; c < totalBoardCols; c++) {
      td.push(
        <td
          key={`${r},${c}`}
          // className={boardStatus[r][c] ? 'alive' : 'dead'}
          className={`cellState${boardStatus[r][c].state}`}
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
    speed: 850,
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
      // boardStatus: newBoardStatus(() => false),
      boardStatus: newBoardStatus(() => 0),
      generation: 0,
      isGameRunning: false,
    });
  };

  // New Board button action
  handleNewBoard = () => {
    this.setState({
      boardStatus: newBoardStatus(),
      generation: 0,
      isGameRunning: false,
    });
  };

  incrementCellState = (cell) => {
    cell.state = (cell.state + 1) % numCellStates;
    return cell;
  };

  // Toggle a cell's status and update the board's status as a result
  handleIncrementCellState = (r, c) => {
    const toggleBoardStatus = prevState => {
      const clonedBoardStatus = JSON.parse(JSON.stringify(prevState.boardStatus));
      // clonedBoardStatus[r][c] = !clonedBoardStatus[r][c];
      // clonedBoardStatus[r][c].state  = (clonedBoardStatus[r][c].state + 1) % numCellStates;
      clonedBoardStatus[r][c] = this.incrementCellState(clonedBoardStatus[r][c]);
      return clonedBoardStatus;
    };

    this.setState(prevState => ({
      boardStatus: toggleBoardStatus(prevState)
    }));
  };

  // Return the number of True neighbours of a given cell
  getNumTrueNeighbours = (boardStatus, r, c) => {
    const neighbours = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]];
    return neighbours.reduce((numTrueNeighbours, neighbour) => {
      const neighbourRow = r + neighbour[0];
      const neighbourCol = c + neighbour[1];

      const isNeighbourOnBoard = (neighbourRow >= 0 && neighbourRow < totalBoardRows && neighbourCol >= 0 && neighbourCol < totalBoardCols);
      const isNeighbourAlive = isNeighbourOnBoard && boardStatus[neighbourRow][neighbourCol].state > 0;

      return numTrueNeighbours + isNeighbourAlive;

    }, 0);
  };

  // Move the board forward one step by following the rules defined in Conway's Game of Life
  handleStep = () => {
    const nextStep = prevState => {
      // current board status
      const boardStatus = prevState.boardStatus;

      // updated board status
      const clonedBoardStatus = JSON.parse(JSON.stringify(prevState.boardStatus));

      // Run through each cell and apply GoL rules for each cell
      for (let r = 0; r < totalBoardRows; r++) {
        for (let c = 0; c < totalBoardCols; c++) {
          const numTrueNeighbours = this.getNumTrueNeighbours(boardStatus, r, c);

          // Conway's Game of Life rule logic
          // console.log(r, c, numTrueNeighbours);
          if (boardStatus[r][c].state === 0) {
            if ([3].includes(numTrueNeighbours)) {
              // console.log(r, c, "state 0 updating")
              clonedBoardStatus[r][c] = this.incrementCellState(clonedBoardStatus[r][c]);
            }
          } else if (boardStatus[r][c].state === 1) {
            if ([0, 1, 4, 5, 6, 7, 8].includes(numTrueNeighbours)) {
              clonedBoardStatus[r][c] = this.incrementCellState(clonedBoardStatus[r][c]);
            }
          }
        }
      }

      return clonedBoardStatus;
    };

    this.setState(prevState => ({
      boardStatus: nextStep(prevState),
      generation: prevState.generation + 1,
    }));
  };

  handleSpeedChange = newSpeed => {
    this.setState({
      speed: newSpeed,
    });
  };

  handleRun = () => {
    this.setState({ isGameRunning: true });
  };

  handleStop = () => {
    this.setState({ isGameRunning: false });
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
      }, 1050 - speed);
    }
  }

  render() {
    const { boardStatus, isGameRunning, generation, speed } = this.state;

    return (
      <div>
        <h1>Dylan's Game of Life</h1>
        <BoardGrid boardStatus={boardStatus} onIncrementCellState={this.handleIncrementCellState} />
        <div className="flexRow upperControls">
          <span>
            {"- "}
            <Slider speed={speed} onSpeedChange={this.handleSpeedChange} />
            {" +"}
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