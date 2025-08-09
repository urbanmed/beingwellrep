import { useNavigate } from "react-router-dom";

export function Header() {
  const navigate = useNavigate();

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center justify-center px-4 py-3">
        <div 
          className="cursor-pointer"
          onClick={() => navigate("/")}
        >
          <img 
            src="/lovable-uploads/62e37d74-1210-43f7-acb4-21ffaa3c1aaa.png" 
            alt="BeingWell" 
            className="h-8 w-auto object-contain"
            style={{ imageRendering: 'crisp-edges' }}
          />
        </div>
      </div>
    </header>
  );
}