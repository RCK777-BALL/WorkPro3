import Layout from '../components/layout/Layout';
import { useParams } from 'react-router-dom';

const AssetDetails = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <Layout title="Asset Details">
      <div className="p-4">
        <p>Details for asset {id}</p>
      </div>
    </Layout>
  );
};

export default AssetDetails;
