import React from 'react';
import Layout from '../components/layout/Layout';
import { DepartmentForm, type DepartmentPayload } from '../components/departments/forms';
import { useNavigate } from 'react-router-dom';
import { createDepartment } from '../api/departments';

const NewDepartmentPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Layout title="New Department">
      <div className="max-w-lg mx-auto p-6">
        <DepartmentForm
          onSubmit={async (dep: DepartmentPayload) => {
            await createDepartment(dep);
            navigate('/departments');
          }}
          onCancel={() => navigate('/departments')}
        />
      </div>
    </Layout>
  );
};

export default NewDepartmentPage;
