import React from 'react';
import { DepartmentForm, type DepartmentPayload } from '../components/departments/forms';
import { useNavigate } from 'react-router-dom';
import { createDepartment } from '../api/departments';

const NewDepartmentPage: React.FC = () => {
  const navigate = useNavigate();
  return (
          <div className="max-w-lg mx-auto p-6">
        <DepartmentForm
          onSubmit={async (dep: DepartmentPayload) => {
            await createDepartment(dep);
            navigate('/departments');
          }}
          onCancel={() => navigate('/departments')}
        />
      </div>
  );
};

export default NewDepartmentPage;
