/*
 * SPDX-License-Identifier: MIT
 */

import { useParams } from 'react-router-dom';

const AssetDetails = () => {
  const { id } = useParams<{ id: string }>();

  return (
          <div className="p-4">
        <p>Details for asset {id}</p>
      </div>
  );
};

export default AssetDetails;
