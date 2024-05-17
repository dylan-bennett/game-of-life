import React, { Component, useState } from "react";

const width = 400;
const height = 300;
const rows = 4;
const cols = 5;
const numCellStates = 2;

// Initialize our 2D array of cells
const createCells = () => {
    const cells = [];
    for (let r = 0; r < rows; r++) {
        cells[r] = [];
        for (let c = 0; c < cols; c++) {
            cells[r][c] = {
                row: r,
                col: c,
                state: 0,
                neighbours: 0,
            };
        }
    }

    return cells;
};

// Grid of cells, rendered as an HTML table
const Grid = ({ cells, onCellClick }) => {
    const handleCellClick = (cell) => onCellClick(cell);

    const tableRows = [];
    for (let r = 0; r < rows; r++) {
        const tableCells = [];
        for (let c = 0; c < cols; c++) {
            tableCells.push(
                <td
                    key={`${r},${c}`}
                    width={width / cols}
                    height={height / rows}
                    onClick={() => handleCellClick(cells[r][c])}
                >{cells[r][c].state}<br />{cells[r][c].neighbours}</td>
            );
        }
        tableRows.push(<tr key={r}>{tableCells}</tr>);
    }

    return <table><tbody>{tableRows}</tbody></table>;
};



class App extends Component {
    state = {
        cells: createCells(),
    }

    // Increment the cell's state, wrapping around
    incrementCellState = (cell) => {
        cell.state = (cell.state + 1) % numCellStates;
        return cell;
    };

    getNumNeighbours = (cell, cells) => {
        const neighbourIndices = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]];

        return neighbourIndices.reduce((numNeighbours, neighbour) => {
            const neighbourRow = cell.row + neighbour[0];
            const neighbourCol = cell.col + neighbour[1];

            const isNeighbourOnBoard = (neighbourRow >= 0 && neighbourRow < rows && neighbourCol >= 0 && neighbourCol < cols);
            const isNeighbourAlive = isNeighbourOnBoard && cells[neighbourRow][neighbourCol].state > 0;

            return numNeighbours + isNeighbourAlive;
        }, 0);
    };

    // Handler function for clicking on a cell
    handleCellClick = (cell) => {
        const updateCells = (prevState) => {
            // Make a deep copy of the cells
            const newCells = JSON.parse(JSON.stringify(prevState.cells));

            // Increment the cell's state
            newCells[cell.row][cell.col] = this.incrementCellState(cell);
            return newCells;
        }

        this.setState((prevState) => ({
            cells: updateCells(prevState)
        }));
    };

    // Handler function for moving the entire board forward one step
    handleStepClick = () => {
        const updateAllCells = (prevState) => {
            // Make a deep copy of the cells
            const newCells = JSON.parse(JSON.stringify(prevState.cells));

            // Go through each cell and update its state based on the Game of Life rules
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    // Get the number of neighbours of that cell
                    newCells[r][c].neighbours = this.getNumNeighbours(newCells[r][c], prevState.cells);

                    // Update the cell's state based on the rules
                    // TODO
                }
            }

            return newCells;
        };

        this.setState((prevState) => ({
            cells: updateAllCells(prevState)
        }));
    };

    render() {
        return (
            <>
                <Grid cells={this.state.cells} onCellClick={this.handleCellClick} />
                <div><button type="button" onClick={this.handleStepClick}>Step</button></div>
            </>
        );
    }
}

export default App;