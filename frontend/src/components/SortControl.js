import React from 'react';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import './SortControl.css';

const SortControl = ({ options, value, order, onChange, onOrderChange }) => {
  return (
    <div className="sort-control">
      <select
        className="sort-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <button
        className="sort-order-btn"
        onClick={() => onOrderChange(order === 'ASC' ? 'DESC' : 'ASC')}
        title={order === 'ASC' ? 'Ascending' : 'Descending'}
      >
        {order === 'ASC' ? <FiArrowUp /> : <FiArrowDown />}
      </button>
    </div>
  );
};

export default SortControl;
