export interface ExamplePrompt {
  id: string;
  label: string;
  prompt: string;
}

export interface SchemaTemplate {
  id: string;
  name: string;
  description: string;
  examples: ExamplePrompt[];
  schema: {
    name: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const SCHEMA_TEMPLATES: SchemaTemplate[] = [
  {
    id: 'contact-info',
    name: 'Contact Information',
    description: 'Extract contact details like name, email, phone',
    examples: [
      {
        id: 'contact-1',
        label: 'Business card',
        prompt: 'Extract the contact information from this message: "Hi, I\'m John Smith from Acme Corp. You can reach me at john.smith@acme.com or call me at (555) 123-4567."',
      },
      {
        id: 'contact-2',
        label: 'Email signature',
        prompt: 'Extract contact details from this email signature: "Best regards, Maria Garcia | Senior Developer | TechStart Inc. | maria.g@techstart.io | Mobile: +1 (415) 555-0199"',
      },
      {
        id: 'contact-3',
        label: 'Informal intro',
        prompt: 'Parse contact info from: "Hey! I\'m Alex Chen, freelance designer. Hit me up at alex@designstudio.co or text 555-888-1234 if you need any graphics work!"',
      },
    ],
    schema: {
      name: 'ContactInfo',
      properties: {
        name: { type: 'string', description: 'Full name of the person' },
        email: { type: 'string', description: 'Email address' },
        phone: { type: 'string', description: 'Phone number' },
        company: { type: 'string', description: 'Company or organization name' },
      },
      required: ['name', 'email'],
    },
  },
  {
    id: 'product-details',
    name: 'Product Details',
    description: 'Extract product information with price and features',
    examples: [
      {
        id: 'product-1',
        label: 'Laptop listing',
        prompt: 'Extract product details from this description: "The new UltraBook Pro 15 laptop features a stunning 4K display, 32GB RAM, and 1TB SSD storage. Available now for $1,299 in the Electronics category. Key features include all-day battery life, lightweight design, and thunderbolt connectivity."',
      },
      {
        id: 'product-2',
        label: 'Kitchen appliance',
        prompt: 'Parse this product listing: "SmartBrew Coffee Maker - $89.99. Make perfect coffee every time with programmable brewing, built-in grinder, and thermal carafe. Features: 12-cup capacity, auto-shutoff, WiFi enabled for app control. Category: Kitchen Appliances."',
      },
      {
        id: 'product-3',
        label: 'Fitness gear',
        prompt: 'Extract product info: "ProFit Resistance Bands Set - Complete home workout kit for $34.95. Includes 5 resistance levels, door anchor, ankle straps, and carrying bag. Perfect for strength training, physical therapy, and stretching. Sports & Fitness category."',
      },
    ],
    schema: {
      name: 'ProductDetails',
      properties: {
        title: { type: 'string', description: 'Product title or name' },
        price: { type: 'number', description: 'Price in USD' },
        description: { type: 'string', description: 'Brief product description' },
        features: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of key features',
        },
        category: { type: 'string', description: 'Product category' },
      },
      required: ['title', 'price'],
    },
  },
  {
    id: 'summary-points',
    name: 'Summary with Key Points',
    description: 'Summarize content into main points and conclusion',
    examples: [
      {
        id: 'summary-1',
        label: 'Remote work article',
        prompt: 'Summarize the key points from this article about remote work: "Remote work has transformed how companies operate. Studies show productivity often increases when employees work from home. However, challenges include maintaining team cohesion and work-life balance. Companies are adopting hybrid models to balance flexibility with collaboration. The future of work will likely blend remote and in-office arrangements."',
      },
      {
        id: 'summary-2',
        label: 'Tech announcement',
        prompt: 'Summarize this tech news: "Apple announced its latest M3 chip lineup today, promising 30% faster CPU performance and 40% better GPU efficiency. The chips use 3nm technology and will power the new MacBook Pro models. Pricing starts at $1,599 for the base model. Pre-orders begin next week with shipping in November."',
      },
      {
        id: 'summary-3',
        label: 'Research findings',
        prompt: 'Extract key points from: "A new study reveals that regular exercise improves cognitive function in adults over 50. Participants who exercised 150 minutes weekly showed 23% better memory retention. The research followed 5,000 subjects over 3 years. Scientists recommend combining cardio with strength training for optimal brain health benefits."',
      },
    ],
    schema: {
      name: 'Summary',
      properties: {
        title: { type: 'string', description: 'Title or topic of the summary' },
        main_points: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of main points or takeaways',
        },
        conclusion: { type: 'string', description: 'Final conclusion or summary' },
      },
      required: ['main_points', 'conclusion'],
    },
  },
  {
    id: 'sentiment-analysis',
    name: 'Sentiment Analysis',
    description: 'Analyze sentiment with score and reasoning',
    examples: [
      {
        id: 'sentiment-1',
        label: 'Positive review',
        prompt: 'Analyze the sentiment of this customer review: "I absolutely love this product! The quality exceeded my expectations and shipping was incredibly fast. The only minor issue was the packaging could be better, but overall I\'m thrilled with my purchase and will definitely buy again!"',
      },
      {
        id: 'sentiment-2',
        label: 'Negative feedback',
        prompt: 'Analyze this review: "Extremely disappointed with this purchase. The item arrived damaged and customer service was unhelpful. After 3 weeks of back and forth emails, I still haven\'t received a refund. Would not recommend to anyone."',
      },
      {
        id: 'sentiment-3',
        label: 'Mixed opinion',
        prompt: 'Determine the sentiment: "The restaurant has amazing food - best pasta I\'ve ever had. However, the service was slow and our waiter seemed distracted. The ambiance is nice but it\'s quite loud. Worth visiting for the food alone, just don\'t go if you\'re in a hurry."',
      },
    ],
    schema: {
      name: 'SentimentAnalysis',
      properties: {
        sentiment: {
          type: 'string',
          description: 'Overall sentiment: positive, negative, or neutral',
        },
        score: {
          type: 'number',
          description: 'Sentiment score from -1 (negative) to 1 (positive)',
        },
        reasoning: { type: 'string', description: 'Explanation for the sentiment' },
        key_phrases: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key phrases that influenced the sentiment',
        },
      },
      required: ['sentiment', 'score', 'reasoning'],
    },
  },
  {
    id: 'task-extraction',
    name: 'Task Extraction',
    description: 'Extract action items and tasks from text',
    examples: [
      {
        id: 'task-1',
        label: 'Meeting notes',
        prompt: 'Extract the tasks from this meeting note: "Team meeting recap: Sarah needs to finish the design mockups by Friday. Mike will review the API documentation and share feedback. Everyone should update their project status in the tracker. We also need someone to schedule the client demo - probably best if Alex handles that since he\'s the project lead."',
      },
      {
        id: 'task-2',
        label: 'Email thread',
        prompt: 'Find action items in this email: "Hi team, following up on our discussion: 1) Please submit your Q4 reports by end of week. 2) Jennifer will coordinate with marketing on the launch timeline. 3) We need volunteers for the company retreat planning committee. 4) Don\'t forget to complete the security training - deadline is December 15th."',
      },
      {
        id: 'task-3',
        label: 'Project update',
        prompt: 'Extract tasks from: "Sprint planning update: Backend team (Tom) to complete API endpoints. Frontend (Lisa) blocked on designs - needs to sync with UX. QA should start writing test cases. Product owner to clarify requirements for the notification feature. Target: release candidate by next Tuesday."',
      },
    ],
    schema: {
      name: 'TaskExtraction',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              priority: { type: 'string' },
              assignee: { type: 'string' },
            },
          },
          description: 'List of extracted tasks',
        },
        deadline_mentioned: { type: 'boolean', description: 'Whether a deadline was mentioned' },
        summary: { type: 'string', description: 'Brief summary of all tasks' },
      },
      required: ['tasks'],
    },
  },
  // Figma Analysis Templates
  {
    id: 'figma-unique-components',
    name: 'Figma Unique Components',
    description: 'Extract list of unique components used in a Figma file',
    examples: [
      {
        id: 'figma-comp-1',
        label: 'All components',
        prompt: 'From the Figma JSON below, extract all unique component and instance names. Group them by category if naming patterns exist (e.g., Button/Primary, Button/Secondary → Button category).',
      },
      {
        id: 'figma-comp-2',
        label: 'Design system inventory',
        prompt: 'Analyze this Figma file and create an inventory of all reusable components. Include COMPONENT and INSTANCE node types.',
      },
      {
        id: 'figma-comp-3',
        label: 'Component count',
        prompt: 'Count and list all unique components in this Figma structure. Deduplicate by name and provide the total count.',
      },
    ],
    schema: {
      name: 'FigmaUniqueComponents',
      properties: {
        components: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of unique component names',
        },
        count: { type: 'number', description: 'Total count of unique components' },
        categories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Categories/groups of components based on naming patterns',
        },
      },
      required: ['components', 'count'],
    },
  },
  {
    id: 'figma-ids-names',
    name: 'Figma IDs & Names',
    description: 'Extract component IDs with their names',
    examples: [
      {
        id: 'figma-id-1',
        label: 'Full node registry',
        prompt: 'Extract all nodes from this Figma JSON. For each node, provide its id, name, and type. Include FRAME, TEXT, COMPONENT, INSTANCE, VECTOR, and RECTANGLE nodes.',
      },
      {
        id: 'figma-id-2',
        label: 'Components only',
        prompt: 'From this Figma structure, extract only COMPONENT and INSTANCE nodes with their id, name, and componentId (if present).',
      },
      {
        id: 'figma-id-3',
        label: 'Named elements',
        prompt: 'List all named elements in this Figma file with their IDs. Skip nodes with generic names like "Frame" or "Rectangle".',
      },
    ],
    schema: {
      name: 'FigmaIdNameMapping',
      properties: {
        nodes: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of {id, name, type} objects',
        },
        total: { type: 'number', description: 'Total number of nodes' },
      },
      required: ['nodes', 'total'],
    },
  },
  {
    id: 'figma-node-classification',
    name: 'Figma Node Classification',
    description: 'Classify nodes as layout, text, or visual-only with score',
    examples: [
      {
        id: 'figma-class-1',
        label: 'Full classification',
        prompt: 'Classify each node in this Figma JSON as: "layout" (has layoutMode, padding, or structural children), "text" (TEXT type with content), or "visual" (decorative only - fills/strokes but no semantic meaning). Provide a confidence score 0-1.',
      },
      {
        id: 'figma-class-2',
        label: 'Content vs decoration',
        prompt: 'Analyze this Figma structure and separate content nodes (text, interactive elements) from purely decorative/presentational nodes (backgrounds, borders, shadows).',
      },
      {
        id: 'figma-class-3',
        label: 'Layout structure',
        prompt: 'Identify all layout container nodes in this Figma file. A layout node has layoutMode (HORIZONTAL/VERTICAL) or contains structural children. Score by layout complexity.',
      },
    ],
    schema: {
      name: 'FigmaNodeClassification',
      properties: {
        classifications: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of {id, name, category, score} where category is "layout"|"text"|"visual", score is 0-1',
        },
        summary: {
          type: 'object',
          description: '{layout_count, text_count, visual_count}',
        },
      },
      required: ['classifications', 'summary'],
    },
  },
  {
    id: 'figma-html-mapping',
    name: 'Figma to HTML Mapping',
    description: 'Map Figma nodes to HTML elements or mark as presentation-only',
    examples: [
      {
        id: 'figma-html-1',
        label: 'Semantic HTML',
        prompt: 'Map each node in this Figma JSON to its semantic HTML equivalent. Use node names as hints (e.g., "header"→<header>, "nav"→<nav>). Mark decorative elements as presentational (no HTML needed).',
      },
      {
        id: 'figma-html-2',
        label: 'Accessibility mapping',
        prompt: 'Analyze this Figma structure for HTML conversion. Identify which nodes need semantic HTML elements for accessibility vs which are purely presentational (CSS-only).',
      },
      {
        id: 'figma-html-3',
        label: 'Component to HTML',
        prompt: 'For each component/instance in this Figma file, suggest the appropriate HTML element or component pattern. Note if the element is presentational-only with no semantic impact.',
      },
    ],
    schema: {
      name: 'FigmaHtmlMapping',
      properties: {
        mappings: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of {figma_id, figma_name, figma_type, html_element, is_presentational, notes}',
        },
        semantic_elements: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of semantic HTML elements used',
        },
        presentational_count: {
          type: 'number',
          description: 'Count of presentation-only elements',
        },
      },
      required: ['mappings', 'semantic_elements'],
    },
  },
];
