import React from 'react';

interface Props {
  value: string;
  onChange: (val: string) => void;
}

const RecurrenceRuleForm: React.FC<Props> = ({ value, onChange }) => {
  return (
    <input
      className="border p-1 w-full"
      placeholder="e.g. every 2 weeks"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
};

export default RecurrenceRuleForm;
