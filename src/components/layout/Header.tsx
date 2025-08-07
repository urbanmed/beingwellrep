import { useNavigate } from "react-router-dom";

export function Header() {
  const navigate = useNavigate();

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3">
        <div 
          className="cursor-pointer"
          onClick={() => navigate("/")}
        >
          <img 
            src="/lovable-uploads/734e632d-00c3-4bdb-88c7-058da86d8be6.png" 
            alt="BeingWell" 
            className="h-8 w-auto object-contain"
            style={{ imageRendering: 'crisp-edges' }}
          />
        </div>
      </div>
    </header>
  );
}