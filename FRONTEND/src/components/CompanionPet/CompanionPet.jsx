import NekoCanvas from "./NekoCanvas";
import { useCompanionPet } from "./CompanionContext";

const CompanionPet = () => {
  const { isVisible } = useCompanionPet();

  if (!isVisible) return null;

  return <NekoCanvas />;
};

export default CompanionPet;
