const MunicipalDashboard = () => {
  const [municipalities, setMunicipalities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/municipalities');
        const data = await response.json();
        setMunicipalities(data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading municipalities...</div>;
  }

  return (
    <div>
      <h1>Municipal Dashboard</h1>
      {municipalities.map(municipality => (
        <div key={municipality.id}>
          <h3>{municipality.name}</h3>
          <p>Population: {municipality.population}</p>
          <p>Area: {municipality.area} km²</p>
        </div>
      ))}
    </div>
  );
};

export default MunicipalDashboard;