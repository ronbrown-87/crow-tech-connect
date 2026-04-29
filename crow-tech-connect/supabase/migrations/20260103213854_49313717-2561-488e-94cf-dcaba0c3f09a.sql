-- Add new service categories enum values
ALTER TYPE service_category ADD VALUE IF NOT EXISTS 'automotive';
ALTER TYPE service_category ADD VALUE IF NOT EXISTS 'tech';
ALTER TYPE service_category ADD VALUE IF NOT EXISTS 'creative';
ALTER TYPE service_category ADD VALUE IF NOT EXISTS 'outdoor';
ALTER TYPE service_category ADD VALUE IF NOT EXISTS 'education';
ALTER TYPE service_category ADD VALUE IF NOT EXISTS 'events';
ALTER TYPE service_category ADD VALUE IF NOT EXISTS 'painting';
ALTER TYPE service_category ADD VALUE IF NOT EXISTS 'carpentry';
ALTER TYPE service_category ADD VALUE IF NOT EXISTS 'landscaping';