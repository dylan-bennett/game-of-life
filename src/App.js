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

    incrementCellState = (cell) => {
        cell.state = (cell.state + 1) % numCellStates;
        return cell;
    };

    handleCellClick = (cell) => {
        const updatedCells = (prevState) => {
            // Make a deep copy of the cells
            const newCells = JSON.parse(JSON.stringify(prevState.cells));

            // Update the desired cell
            newCells[cell.row][cell.col] = this.incrementCellState(cell);
            return newCells;
        }

        this.setState((prevState) => ({
            cells: updatedCells(prevState)
        }));
    };

    render() {
        return (
            <><Grid cells={this.state.cells} onCellClick={this.handleCellClick} /></>
        );
    }
}

export default App;