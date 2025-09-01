import React from 'react';
import Layout from '../components/layout/Layout';
import DepartmentForm from '../components/departments/DepartmentForm';
import { useNavigate } from 'react-router-dom';
import type { Department } from '../types';

const NewDepartmentPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Layout title="New Department">
      <div className="max-w-lg mx-auto p-6">
        <DepartmentForm onSuccess={(dep: Department) => navigate('/departments')} />
      </div>
    </Layout>
  );
};

export default NewDepartmentPage;
