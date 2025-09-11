/*
 * SPDX-License-Identifier: MIT
 */

 
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/context/ToastContext';

const formatPath = (path: string) => {
  const clean = path.replace(/^\/+/, '').split(/[?#]/)[0];
  if (!clean) return 'Home';
  return clean
    .split('/')
    .map((segment) =>
      segment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    )
    .join(' ');
};

 
const useNavigateTo = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

 
  return (path: string, message?: string) => {
    navigate(path);
    const toastMessage = message ?? `Navigated to ${formatPath(path)}`;
    addToast(toastMessage, 'success');
  };
 
};

export default useNavigateTo;
