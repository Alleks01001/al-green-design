export default function ArchitectureFeatureList() {
  const features = [
    'Bodenplatte',
    'Außenwand',
    'Innenwand',
    'Dach',
    'Fenster',
    'Tür',
    'Schiebetür',
    'Balkon',
    'Geländer',
    'Stütze',
    'Carport',
    'Wintergarten'
  ];

  return (
    <div className="list">
      {features.map(feature => (
        <div className="item" key={feature}>
          <strong>{feature}</strong>
          <span>Als eigenes 2D-/3D-Bauteil vorgesehen.</span>
        </div>
      ))}
    </div>
  );
}
