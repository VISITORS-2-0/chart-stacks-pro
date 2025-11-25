interface AssociationProps {
  name: string;
}

export function Association({ name }: AssociationProps) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <h2 className="text-2xl font-semibold text-foreground mb-3">
          {name}
        </h2>
        <p className="text-muted-foreground text-lg">
          Association analysis workspace
        </p>
      </div>
    </div>
  );
}
