import React, { useEffect, useState } from 'react';
import http from '../../lib/http';
import type { DepartmentHierarchy } from '../../types';
import { useDepartmentStore } from '../../store/departmentStore';

const HierarchyView: React.FC = () => {
  const [data, setData] = useState<DepartmentHierarchy[]>([]);
  const refreshCache = useDepartmentStore((s) => s.refreshCache);

  const fetchHierarchy = async () => {
    await refreshCache();
    const departments = useDepartmentStore.getState().departments;
    const detailed = await Promise.all(
      departments.map(async (dep) => {
        const hRes = await http.get(`/departments/${dep.id}/hierarchy`);
        return hRes.data as DepartmentHierarchy;
      })
    );
    setData(detailed);
  };

  useEffect(() => {
    fetchHierarchy();
  }, []);

  return (
    <div className="space-y-4">
      {data.map((dep) => (
        <div key={dep.id} className="border p-4 rounded">
          <h3 className="font-semibold">{dep.name}</h3>
          {dep.lines.map((line) => (
            <div key={line.id} className="ml-4 mt-2">
              <p className="font-medium">{line.name}</p>
              {line.stations.map((st) => (
                <div key={st.id} className="ml-4 mt-1">
                  <p>{st.name}</p>
                  <ul className="ml-4 list-disc">
                    {st.assets.map((a) => (
                      <li key={a.id}>{a.name}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default HierarchyView;
