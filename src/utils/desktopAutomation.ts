
// Desktop automation utilities

// Command patterns for automation
export const COMMAND_PATTERNS = {
  OPEN_BROWSER: /open (chrome|firefox|edge|browser)/i,
  SEARCH_WEB: /search (for|about) (.+)/i,
  OPEN_APPLICATION: /open (app|application) (.+)/i,
  TAKE_SCREENSHOT: /take (a screenshot|screenshot)/i,
  SYSTEM_INFO: /(show|tell me|get) (system|computer) (info|information|stats)/i,
};

// Types for desktop automation
export interface AutomationCommand {
  type: 'openBrowser' | 'searchWeb' | 'openApplication' | 'systemAction' | 'unknown';
  target?: string;
  query?: string;
  action?: string;
  originalCommand: string;
}

// Parse user command to determine automation intent
export function parseCommand(command: string): AutomationCommand {
  // Default response
  const result: AutomationCommand = {
    type: 'unknown',
    originalCommand: command
  };
  
  // Check for opening browser
  const browserMatch = command.match(COMMAND_PATTERNS.OPEN_BROWSER);
  if (browserMatch) {
    result.type = 'openBrowser';
    result.target = browserMatch[1].toLowerCase();
    return result;
  }
  
  // Check for search commands
  const searchMatch = command.match(COMMAND_PATTERNS.SEARCH_WEB);
  if (searchMatch) {
    result.type = 'searchWeb';
    result.query = searchMatch[2];
    return result;
  }
  
  // Check for opening applications
  const appMatch = command.match(COMMAND_PATTERNS.OPEN_APPLICATION);
  if (appMatch) {
    result.type = 'openApplication';
    result.target = appMatch[2].toLowerCase();
    return result;
  }
  
  // Check for system actions
  if (COMMAND_PATTERNS.TAKE_SCREENSHOT.test(command)) {
    result.type = 'systemAction';
    result.action = 'screenshot';
    return result;
  }
  
  if (COMMAND_PATTERNS.SYSTEM_INFO.test(command)) {
    result.type = 'systemAction';
    result.action = 'systemInfo';
    return result;
  }
  
  return result;
}

// Process common desktop automation learning topics
export function getAutomationLearningTopic(command: AutomationCommand): string | null {
  switch (command.type) {
    case 'openBrowser':
      return 'Browser Applications';
    case 'searchWeb':
      return command.query ? `Web Search: ${command.query}` : 'Web Searching';
    case 'openApplication':
      return command.target ? `Desktop Applications: ${command.target}` : 'Desktop Applications';
    case 'systemAction':
      return 'System Operations';
    default:
      return null;
  }
}
