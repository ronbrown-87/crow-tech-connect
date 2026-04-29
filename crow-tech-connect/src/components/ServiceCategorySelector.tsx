import { Database } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Wrench, 
  Zap, 
  Droplets, 
  Home, 
  Paintbrush, 
  Hammer, 
  TreeDeciduous, 
  Car, 
  Monitor, 
  Palette, 
  GraduationCap, 
  PartyPopper,
  Ruler,
  HardHat,
  Layers
} from 'lucide-react';

type ServiceCategory = Database['public']['Enums']['service_category'];

interface ServiceCategorySelectorProps {
  selectedCategories: ServiceCategory[];
  onChange: (categories: ServiceCategory[]) => void;
  disabled?: boolean;
}

const CATEGORY_CONFIG: Record<ServiceCategory, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  construction: { label: 'Construction', icon: HardHat, color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
  plumbing: { label: 'Plumbing', icon: Droplets, color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  electrical: { label: 'Electrical', icon: Zap, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' },
  roofing: { label: 'Roofing', icon: Home, color: 'bg-slate-500/10 text-slate-600 border-slate-500/30' },
  tiling: { label: 'Tiling', icon: Layers, color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30' },
  surveying: { label: 'Surveying', icon: Ruler, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  maintenance: { label: 'Maintenance', icon: Wrench, color: 'bg-gray-500/10 text-gray-600 border-gray-500/30' },
  automotive: { label: 'Automotive', icon: Car, color: 'bg-red-500/10 text-red-600 border-red-500/30' },
  tech: { label: 'Tech & Digital', icon: Monitor, color: 'bg-violet-500/10 text-violet-600 border-violet-500/30' },
  creative: { label: 'Creative & Media', icon: Palette, color: 'bg-pink-500/10 text-pink-600 border-pink-500/30' },
  outdoor: { label: 'Outdoor & Landscaping', icon: TreeDeciduous, color: 'bg-green-500/10 text-green-600 border-green-500/30' },
  education: { label: 'Education', icon: GraduationCap, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30' },
  events: { label: 'Events', icon: PartyPopper, color: 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/30' },
  painting: { label: 'Painting', icon: Paintbrush, color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  carpentry: { label: 'Carpentry', icon: Hammer, color: 'bg-stone-500/10 text-stone-600 border-stone-500/30' },
  landscaping: { label: 'Landscaping', icon: TreeDeciduous, color: 'bg-lime-500/10 text-lime-600 border-lime-500/30' },
};

const ALL_CATEGORIES: ServiceCategory[] = [
  'construction',
  'plumbing',
  'electrical',
  'roofing',
  'tiling',
  'surveying',
  'maintenance',
  'automotive',
  'tech',
  'creative',
  'outdoor',
  'education',
  'events',
  'painting',
  'carpentry',
  'landscaping',
];

const ServiceCategorySelector = ({ selectedCategories, onChange, disabled }: ServiceCategorySelectorProps) => {
  const handleToggle = (category: ServiceCategory) => {
    if (disabled) return;
    
    if (selectedCategories.includes(category)) {
      onChange(selectedCategories.filter(c => c !== category));
    } else {
      onChange([...selectedCategories, category]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-4">
        {selectedCategories.length > 0 ? (
          selectedCategories.map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            return (
              <Badge
                key={cat}
                variant="outline"
                className={`${config.color} cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={() => handleToggle(cat)}
              >
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">No services selected yet</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ALL_CATEGORIES.map((category) => {
          const config = CATEGORY_CONFIG[category];
          const Icon = config.icon;
          const isSelected = selectedCategories.includes(category);
          
          return (
            <div
              key={category}
              onClick={() => handleToggle(category)}
              className={`
                flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                ${isSelected 
                  ? 'border-primary bg-primary/5 shadow-sm' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <Checkbox
                id={`category-${category}`}
                checked={isSelected}
                disabled={disabled}
                className="pointer-events-none"
              />
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <Label 
                htmlFor={`category-${category}`}
                className="flex-1 cursor-pointer font-medium text-sm"
              >
                {config.label}
              </Label>
            </div>
          );
        })}
      </div>
      
      <p className="text-xs text-muted-foreground mt-2">
        Select all the service categories that apply to your business. You can update these anytime.
      </p>
    </div>
  );
};

export default ServiceCategorySelector;
