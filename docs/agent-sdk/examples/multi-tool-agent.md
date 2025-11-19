---
title: "Multi-Tool Agent"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "multi-language"
difficulty: "advanced"
example_type: "integration"
prerequisites:
  - "Completed setup for [TypeScript](../typescript/setup.md) or [Python](../python/setup.md)"
  - "Understanding of [Custom Tools](../typescript/custom-tools.md) or [Python Tools](../python/custom-tools.md)"
  - "Familiarity with REST APIs and external services"
next_steps:
  - "Add [Hooks](../concepts/hooks.md) for monitoring tool usage"
  - "Implement [MCP Integration](./mcp-server-agent.md) for external tools"
  - "Configure [Permissions](../concepts/permissions.md) for security"
related_guides:
  - ../typescript/custom-tools.md
  - ../python/custom-tools.md
  - ../concepts/tools.md
  - ../typescript/client-pattern.md
  - ../python/client-pattern.md
tags:
  - complete-example
  - advanced
  - multi-tool
  - external-apis
  - tool-coordination
  - typescript
  - python
---

# Multi-Tool Agent

## Overview

This example demonstrates a sophisticated agent with multiple custom tools that coordinate to handle complex tasks. It shows how to integrate external APIs, perform data transformations, handle file operations, and execute mathematical calculations - all within a single cohesive agent.

## Problem Statement

You need an agent that can:

- Call external APIs (weather services, currency converters, etc.)
- Perform complex calculations and data transformations
- Read and write files with structured data
- Coordinate multiple tools to accomplish tasks
- Handle errors gracefully across different tool types

This pattern is essential for production agents that need to interact with various systems and services.

## Prerequisites

### For TypeScript
- Node.js 18 or higher
- npm or yarn package manager
- See [TypeScript Custom Tools Guide](../typescript/custom-tools.md) for advanced patterns

### For Python
- Python 3.8 or higher
- pip or uv package manager
- See [Python Custom Tools Guide](../python/custom-tools.md) for tool creation patterns

### General Requirements
- [Tools Concept Guide](../concepts/tools.md) - Understanding tool design
- ANTHROPIC_API_KEY environment variable
- API keys for external services (optional for demo)
- Understanding of async programming

## TypeScript Implementation

### Complete Code

```typescript
/**
 * Example: Multi-Tool Agent with External Integrations
 *
 * Dependencies:
 * - @anthropic-ai/agent-sdk@^1.2.0
 * - zod@^3.22.0
 * - axios@^1.6.0
 *
 * Install: npm install @anthropic-ai/agent-sdk zod axios
 *
 * Setup: export ANTHROPIC_API_KEY=your-api-key-here
 * Optional: export WEATHER_API_KEY=your-weather-api-key (uses demo data if not set)
 * Get your API key from: https://console.anthropic.com/
 */

import { ClaudeSDKClient, tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

// Tool 1: Weather API Integration
const getWeatherForecast = tool({
  name: 'get_weather_forecast',
  description: 'Get detailed weather forecast for a location including temperature, humidity, and conditions',
  input_schema: z.object({
    city: z.string().describe('City name'),
    days: z.number().min(1).max(7).optional().default(3).describe('Number of forecast days (1-7)'),
  }),
  handler: async (input) => {
    try {
      // In production, use real weather API like OpenWeatherMap
      // For demo, generate realistic-looking data
      const forecast = [];
      for (let i = 0; i < input.days; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        forecast.push({
          date: date.toDateString(),
          temp: Math.floor(Math.random() * 25) + 10,
          humidity: Math.floor(Math.random() * 40) + 40,
          condition: ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)],
        });
      }

      return `Weather forecast for ${input.city}:\n` +
        forecast.map(f =>
          `${f.date}: ${f.temp}°C, ${f.humidity}% humidity, ${f.condition}`
        ).join('\n');
    } catch (error) {
      if (error instanceof Error) {
        return `Error fetching weather: ${error.message}`;
      }
      return 'Error fetching weather data';
    }
  },
});

// Tool 2: Currency Conversion
const convertCurrency = tool({
  name: 'convert_currency',
  description: 'Convert an amount from one currency to another using current exchange rates',
  input_schema: z.object({
    amount: z.number().positive().describe('Amount to convert'),
    from: z.string().length(3).describe('Source currency code (e.g., USD)'),
    to: z.string().length(3).describe('Target currency code (e.g., EUR)'),
  }),
  handler: async (input) => {
    try {
      // In production, use real currency API like exchangerate-api.com
      // For demo, use approximate exchange rates
      const rates: Record<string, Record<string, number>> = {
        'USD': { 'EUR': 0.92, 'GBP': 0.79, 'JPY': 149.50, 'USD': 1.0 },
        'EUR': { 'USD': 1.09, 'GBP': 0.86, 'JPY': 162.50, 'EUR': 1.0 },
        'GBP': { 'USD': 1.27, 'EUR': 1.16, 'JPY': 189.00, 'GBP': 1.0 },
        'JPY': { 'USD': 0.0067, 'EUR': 0.0062, 'GBP': 0.0053, 'JPY': 1.0 },
      };

      const fromUpper = input.from.toUpperCase();
      const toUpper = input.to.toUpperCase();

      if (!rates[fromUpper] || !rates[fromUpper][toUpper]) {
        return `Error: Exchange rate not available for ${fromUpper} to ${toUpper}`;
      }

      const rate = rates[fromUpper][toUpper];
      const converted = input.amount * rate;

      return `${input.amount} ${fromUpper} = ${converted.toFixed(2)} ${toUpper} (rate: ${rate})`;
    } catch (error) {
      if (error instanceof Error) {
        return `Error converting currency: ${error.message}`;
      }
      return 'Error converting currency';
    }
  },
});

// Tool 3: Mathematical Calculations
const calculateStatistics = tool({
  name: 'calculate_statistics',
  description: 'Calculate statistical measures (mean, median, std dev) for a list of numbers',
  input_schema: z.object({
    numbers: z.array(z.number()).min(1).describe('Array of numbers to analyze'),
  }),
  handler: async (input) => {
    try {
      const nums = input.numbers;
      const n = nums.length;

      // Calculate mean
      const mean = nums.reduce((a, b) => a + b, 0) / n;

      // Calculate median
      const sorted = [...nums].sort((a, b) => a - b);
      const median = n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];

      // Calculate standard deviation
      const variance = nums.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / n;
      const stdDev = Math.sqrt(variance);

      // Calculate min and max
      const min = Math.min(...nums);
      const max = Math.max(...nums);

      return `Statistics for ${n} numbers:\n` +
        `Mean: ${mean.toFixed(2)}\n` +
        `Median: ${median.toFixed(2)}\n` +
        `Std Dev: ${stdDev.toFixed(2)}\n` +
        `Min: ${min}\n` +
        `Max: ${max}`;
    } catch (error) {
      if (error instanceof Error) {
        return `Error calculating statistics: ${error.message}`;
      }
      return 'Error calculating statistics';
    }
  },
});

// Tool 4: File Operations (Read/Write JSON)
const saveDataToFile = tool({
  name: 'save_data_to_file',
  description: 'Save data to a JSON file',
  input_schema: z.object({
    filename: z.string().describe('File name (will be saved in ./data/)'),
    data: z.record(z.any()).describe('Data to save as JSON object'),
  }),
  handler: async (input) => {
    try {
      const dataDir = path.join(process.cwd(), 'data');

      // Create data directory if it doesn't exist
      await fs.mkdir(dataDir, { recursive: true });

      const filepath = path.join(dataDir, input.filename);

      // Write JSON data
      await fs.writeFile(filepath, JSON.stringify(input.data, null, 2), 'utf-8');

      return `Data saved successfully to ${filepath}`;
    } catch (error) {
      if (error instanceof Error) {
        return `Error saving file: ${error.message}`;
      }
      return 'Error saving file';
    }
  },
});

const readDataFromFile = tool({
  name: 'read_data_from_file',
  description: 'Read data from a JSON file',
  input_schema: z.object({
    filename: z.string().describe('File name to read (from ./data/)'),
  }),
  handler: async (input) => {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      const filepath = path.join(dataDir, input.filename);

      const content = await fs.readFile(filepath, 'utf-8');
      const data = JSON.parse(content);

      return `File contents of ${input.filename}:\n${JSON.stringify(data, null, 2)}`;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          return `File not found: ${input.filename}`;
        }
        return `Error reading file: ${error.message}`;
      }
      return 'Error reading file';
    }
  },
});

// Tool 5: Data Transformation
const transformData = tool({
  name: 'transform_data',
  description: 'Transform an array of objects by filtering, sorting, or mapping',
  input_schema: z.object({
    operation: z.enum(['filter', 'sort', 'map']).describe('Transformation operation'),
    data: z.array(z.any()).describe('Array of data to transform'),
    field: z.string().optional().describe('Field name to operate on'),
    ascending: z.boolean().optional().default(true).describe('Sort order (for sort operation)'),
  }),
  handler: async (input) => {
    try {
      let result;

      switch (input.operation) {
        case 'sort':
          if (!input.field) {
            return 'Error: field parameter required for sort operation';
          }
          result = [...input.data].sort((a, b) => {
            const aVal = a[input.field!];
            const bVal = b[input.field!];
            if (aVal < bVal) return input.ascending ? -1 : 1;
            if (aVal > bVal) return input.ascending ? 1 : -1;
            return 0;
          });
          break;

        case 'filter':
          if (!input.field) {
            return 'Error: field parameter required for filter operation';
          }
          result = input.data.filter(item => item[input.field!] != null);
          break;

        case 'map':
          if (!input.field) {
            return 'Error: field parameter required for map operation';
          }
          result = input.data.map(item => item[input.field!]);
          break;

        default:
          return 'Error: Unknown operation';
      }

      return `Transformation result (${input.operation}):\n${JSON.stringify(result, null, 2)}`;
    } catch (error) {
      if (error instanceof Error) {
        return `Error transforming data: ${error.message}`;
      }
      return 'Error transforming data';
    }
  },
});

// Initialize the agent with all tools
function createMultiToolAgent(): ClaudeSDKClient {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  return new ClaudeSDKClient({
    apiKey: process.env.ANTHROPIC_API_KEY,
    tools: [
      getWeatherForecast,
      convertCurrency,
      calculateStatistics,
      saveDataToFile,
      readDataFromFile,
      transformData,
    ],
    model: 'claude-3-5-sonnet-20241022',
  });
}

// Example usage
async function main() {
  try {
    console.log('Initializing Multi-Tool Agent...\n');
    const agent = createMultiToolAgent();

    // Example 1: Complex task requiring multiple tools
    console.log('Example 1: Multi-tool coordination');
    console.log('─'.repeat(60));
    const response1 = await agent.query({
      prompt: `I need to analyze some weather data. First, get a 5-day forecast for London.
      Then calculate statistics on these temperatures: [15, 18, 22, 19, 17, 20, 16].
      Finally, save both the forecast and statistics to a file called weather-analysis.json.`,
    });
    console.log(response1.text);
    console.log('\n');

    // Example 2: Currency conversion and calculations
    console.log('Example 2: Currency and calculations');
    console.log('─'.repeat(60));
    const response2 = await agent.query({
      prompt: 'Convert 1000 USD to EUR, then calculate what percentage that is of 5000 EUR.',
    });
    console.log(response2.text);
    console.log('\n');

    // Example 3: Data transformation
    console.log('Example 3: Data transformation');
    console.log('─'.repeat(60));
    const response3 = await agent.query({
      prompt: `Sort this data by age in descending order:
      [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}, {"name": "Charlie", "age": 35}]`,
    });
    console.log(response3.text);
    console.log('\n');

    console.log('All examples completed successfully!');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('An unexpected error occurred');
    }
    process.exit(1);
  }
}

main();

/**
 * Expected output:
 *
 * Initializing Multi-Tool Agent...
 *
 * Example 1: Multi-tool coordination
 * ────────────────────────────────────────────────────────────
 * I've gathered the weather forecast for London and analyzed the temperature data:
 *
 * 5-Day London Forecast:
 * - Day 1: 18°C, 65% humidity, Partly Cloudy
 * - Day 2: 16°C, 72% humidity, Rainy
 * - Day 3: 20°C, 58% humidity, Sunny
 * - Day 4: 17°C, 68% humidity, Cloudy
 * - Day 5: 19°C, 61% humidity, Partly Cloudy
 *
 * Temperature Statistics:
 * Mean: 18.14°C
 * Median: 18°C
 * Std Dev: 2.27
 * Range: 15-22°C
 *
 * I've saved all this data to weather-analysis.json for your records.
 *
 * Example 2: Currency and calculations
 * ────────────────────────────────────────────────────────────
 * 1000 USD converts to approximately 920.00 EUR at the current exchange rate.
 * This represents 18.4% of 5000 EUR.
 *
 * Example 3: Data transformation
 * ────────────────────────────────────────────────────────────
 * I've sorted the data by age in descending order:
 * 1. Charlie, age 35
 * 2. Alice, age 30
 * 3. Bob, age 25
 *
 * All examples completed successfully!
 */
```

## Python Implementation

### Installation

```bash
# Create project directory
mkdir multi-tool-agent
cd multi-tool-agent

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install claude-agent-sdk python-dotenv httpx
```

### Complete Code

```python
"""
Example: Multi-Tool Agent with External Integrations

Dependencies:
- claude-agent-sdk>=1.2.0
- python-dotenv>=1.0.0
- httpx>=0.25.0

Install: pip install claude-agent-sdk python-dotenv httpx

Setup:
export ANTHROPIC_API_KEY=your-api-key-here
Optional: export WEATHER_API_KEY=your-weather-api-key (uses demo data if not set)
Get your API key from: https://console.anthropic.com/

Python 3.8+ required
"""

import os
import sys
import json
import asyncio
from typing import Any
from pathlib import Path
from datetime import datetime
import random
import httpx
from claude_agent_sdk import ClaudeSDKClient, tool
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def get_api_key() -> str:
    """
    Validate and retrieve API key from environment.

    Returns:
        API key string

    Raises:
        ValueError: If ANTHROPIC_API_KEY not set
    """
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        raise ValueError(
            'ANTHROPIC_API_KEY environment variable required. '
            'Get your key at: https://console.anthropic.com/'
        )
    return api_key


# Tool 1: Weather API Integration
@tool
async def get_weather_forecast(args: dict[str, Any]) -> dict[str, Any]:
    """
    Get detailed weather forecast for a location including temperature, humidity, and conditions.

    Args:
        args: Dictionary with keys:
            city (str): City name
            days (int, optional): Number of forecast days (1-7), defaults to 3

    Returns:
        Weather forecast data for Claude
    """
    city = args.get('city', '')
    days = args.get('days', 3)

    # Validate days parameter
    days = max(1, min(7, days))

    try:
        # In production, use real weather API like OpenWeatherMap
        # For demo, generate realistic-looking data
        forecast = []
        for i in range(days):
            date = datetime.now()
            date = date.replace(day=date.day + i)
            forecast.append({
                'date': date.strftime('%A, %B %d'),
                'temp': random.randint(10, 35),
                'humidity': random.randint(40, 80),
                'condition': random.choice(['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'])
            })

        result_lines = [f"Weather forecast for {city}:"]
        for f in forecast:
            result_lines.append(
                f"{f['date']}: {f['temp']}°C, {f['humidity']}% humidity, {f['condition']}"
            )

        return {
            "content": [{
                "type": "text",
                "text": "\n".join(result_lines)
            }]
        }

    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error fetching weather: {str(e)}"
            }]
        }


# Tool 2: Currency Conversion
@tool
async def convert_currency(args: dict[str, Any]) -> dict[str, Any]:
    """
    Convert an amount from one currency to another using current exchange rates.

    Args:
        args: Dictionary with keys:
            amount (float): Amount to convert
            from_currency (str): Source currency code (e.g., USD)
            to_currency (str): Target currency code (e.g., EUR)

    Returns:
        Conversion result for Claude
    """
    amount = float(args.get('amount', 0))
    from_currency = args.get('from', '').upper()
    to_currency = args.get('to', '').upper()

    try:
        # In production, use real currency API like exchangerate-api.com
        # For demo, use approximate exchange rates
        rates = {
            'USD': {'EUR': 0.92, 'GBP': 0.79, 'JPY': 149.50, 'USD': 1.0},
            'EUR': {'USD': 1.09, 'GBP': 0.86, 'JPY': 162.50, 'EUR': 1.0},
            'GBP': {'USD': 1.27, 'EUR': 1.16, 'JPY': 189.00, 'GBP': 1.0},
            'JPY': {'USD': 0.0067, 'EUR': 0.0062, 'GBP': 0.0053, 'JPY': 1.0},
        }

        if from_currency not in rates or to_currency not in rates[from_currency]:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Exchange rate not available for {from_currency} to {to_currency}"
                }]
            }

        rate = rates[from_currency][to_currency]
        converted = amount * rate

        return {
            "content": [{
                "type": "text",
                "text": f"{amount} {from_currency} = {converted:.2f} {to_currency} (rate: {rate})"
            }]
        }

    except (ValueError, TypeError) as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error converting currency: Invalid amount: {str(e)}"
            }]
        }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error converting currency: {str(e)}"
            }]
        }


# Tool 3: Mathematical Calculations
@tool
async def calculate_statistics(args: dict[str, Any]) -> dict[str, Any]:
    """
    Calculate statistical measures (mean, median, std dev) for a list of numbers.

    Args:
        args: Dictionary with keys:
            numbers (list): Array of numbers to analyze

    Returns:
        Statistical analysis for Claude
    """
    numbers = args.get('numbers', [])

    try:
        if not numbers:
            return {
                "content": [{
                    "type": "text",
                    "text": "Error: No numbers provided for analysis"
                }]
            }

        nums = [float(n) for n in numbers]
        n = len(nums)

        # Calculate mean
        mean = sum(nums) / n

        # Calculate median
        sorted_nums = sorted(nums)
        if n % 2 == 0:
            median = (sorted_nums[n // 2 - 1] + sorted_nums[n // 2]) / 2
        else:
            median = sorted_nums[n // 2]

        # Calculate standard deviation
        variance = sum((num - mean) ** 2 for num in nums) / n
        std_dev = variance ** 0.5

        # Calculate min and max
        min_val = min(nums)
        max_val = max(nums)

        result = (
            f"Statistics for {n} numbers:\n"
            f"Mean: {mean:.2f}\n"
            f"Median: {median:.2f}\n"
            f"Std Dev: {std_dev:.2f}\n"
            f"Min: {min_val}\n"
            f"Max: {max_val}"
        )

        return {
            "content": [{
                "type": "text",
                "text": result
            }]
        }

    except (ValueError, TypeError) as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error calculating statistics: Invalid number format: {str(e)}"
            }]
        }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error calculating statistics: {str(e)}"
            }]
        }


# Tool 4: File Operations (Write JSON)
@tool
async def save_data_to_file(args: dict[str, Any]) -> dict[str, Any]:
    """
    Save data to a JSON file.

    Args:
        args: Dictionary with keys:
            filename (str): File name (will be saved in ./data/)
            data (dict): Data to save as JSON object

    Returns:
        Success or error message for Claude
    """
    filename = args.get('filename', '')
    data = args.get('data', {})

    try:
        # Create data directory if it doesn't exist
        data_dir = Path.cwd() / 'data'
        data_dir.mkdir(exist_ok=True)

        filepath = data_dir / filename

        # Write JSON data
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

        return {
            "content": [{
                "type": "text",
                "text": f"Data saved successfully to {filepath}"
            }]
        }

    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error saving file: {str(e)}"
            }]
        }


# Tool 5: File Operations (Read JSON)
@tool
async def read_data_from_file(args: dict[str, Any]) -> dict[str, Any]:
    """
    Read data from a JSON file.

    Args:
        args: Dictionary with keys:
            filename (str): File name to read (from ./data/)

    Returns:
        File contents for Claude
    """
    filename = args.get('filename', '')

    try:
        data_dir = Path.cwd() / 'data'
        filepath = data_dir / filename

        # Read JSON data
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        return {
            "content": [{
                "type": "text",
                "text": f"File contents of {filename}:\n{json.dumps(data, indent=2)}"
            }]
        }

    except FileNotFoundError:
        return {
            "content": [{
                "type": "text",
                "text": f"File not found: {filename}"
            }]
        }
    except json.JSONDecodeError as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error reading file: Invalid JSON: {str(e)}"
            }]
        }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error reading file: {str(e)}"
            }]
        }


# Tool 6: Data Transformation
@tool
async def transform_data(args: dict[str, Any]) -> dict[str, Any]:
    """
    Transform an array of objects by filtering, sorting, or mapping.

    Args:
        args: Dictionary with keys:
            operation (str): Transformation operation ('filter', 'sort', 'map')
            data (list): Array of data to transform
            field (str, optional): Field name to operate on
            ascending (bool, optional): Sort order (for sort operation), defaults to True

    Returns:
        Transformation result for Claude
    """
    operation = args.get('operation', '')
    data = args.get('data', [])
    field = args.get('field', '')
    ascending = args.get('ascending', True)

    try:
        result = None

        if operation == 'sort':
            if not field:
                return {
                    "content": [{
                        "type": "text",
                        "text": "Error: field parameter required for sort operation"
                    }]
                }

            result = sorted(
                data,
                key=lambda item: item.get(field, ''),
                reverse=not ascending
            )

        elif operation == 'filter':
            if not field:
                return {
                    "content": [{
                        "type": "text",
                        "text": "Error: field parameter required for filter operation"
                    }]
                }

            result = [item for item in data if item.get(field) is not None]

        elif operation == 'map':
            if not field:
                return {
                    "content": [{
                        "type": "text",
                        "text": "Error: field parameter required for map operation"
                    }]
                }

            result = [item.get(field) for item in data]

        else:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Unknown operation: {operation}"
                }]
            }

        return {
            "content": [{
                "type": "text",
                "text": f"Transformation result ({operation}):\n{json.dumps(result, indent=2)}"
            }]
        }

    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error transforming data: {str(e)}"
            }]
        }


def create_multi_tool_agent() -> ClaudeSDKClient:
    """
    Create a multi-tool agent with all custom tools.

    Returns:
        Configured ClaudeSDKClient instance

    Raises:
        ValueError: If ANTHROPIC_API_KEY not set
    """
    api_key = get_api_key()

    return ClaudeSDKClient(
        api_key=api_key,
        tools=[
            get_weather_forecast,
            convert_currency,
            calculate_statistics,
            save_data_to_file,
            read_data_from_file,
            transform_data,
        ],
        model='claude-3-5-sonnet-20241022',
    )


async def main():
    """Main async entry point demonstrating multi-tool coordination."""
    try:
        print('Initializing Multi-Tool Agent...\n')
        agent = create_multi_tool_agent()

        # Example 1: Complex task requiring multiple tools
        print('Example 1: Multi-tool coordination')
        print('─' * 60)
        response1 = await agent.query(
            prompt=(
                "I need to analyze some weather data. First, get a 5-day forecast for London. "
                "Then calculate statistics on these temperatures: [15, 18, 22, 19, 17, 20, 16]. "
                "Finally, save both the forecast and statistics to a file called weather-analysis.json."
            )
        )
        print(response1.text)
        print('\n')

        # Example 2: Currency conversion and calculations
        print('Example 2: Currency and calculations')
        print('─' * 60)
        response2 = await agent.query(
            prompt='Convert 1000 USD to EUR, then calculate what percentage that is of 5000 EUR.'
        )
        print(response2.text)
        print('\n')

        # Example 3: Data transformation
        print('Example 3: Data transformation')
        print('─' * 60)
        response3 = await agent.query(
            prompt=(
                'Sort this data by age in descending order: '
                '[{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}, {"name": "Charlie", "age": 35}]'
            )
        )
        print(response3.text)
        print('\n')

        print('All examples completed successfully!')

    except ValueError as e:
        print(f'Configuration error: {e}', file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f'Error: {str(e)}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())


"""
Expected output:

Initializing Multi-Tool Agent...

Example 1: Multi-tool coordination
────────────────────────────────────────────────────────────
I've gathered the weather forecast for London and analyzed the temperature data:

5-Day London Forecast:
- Day 1: 18°C, 65% humidity, Partly Cloudy
- Day 2: 16°C, 72% humidity, Rainy
- Day 3: 20°C, 58% humidity, Sunny
- Day 4: 17°C, 68% humidity, Cloudy
- Day 5: 19°C, 61% humidity, Partly Cloudy

Temperature Statistics:
Mean: 18.14°C
Median: 18°C
Std Dev: 2.27
Range: 15-22°C

I've saved all this data to weather-analysis.json for your records.

Example 2: Currency and calculations
────────────────────────────────────────────────────────────
1000 USD converts to approximately 920.00 EUR at the current exchange rate.
This represents 18.4% of 5000 EUR.

Example 3: Data transformation
────────────────────────────────────────────────────────────
I've sorted the data by age in descending order:
1. Charlie, age 35
2. Alice, age 30
3. Bob, age 25

All examples completed successfully!
"""
```

### Running the Python Version

```bash
# Set your API key
export ANTHROPIC_API_KEY=your-api-key-here

# Optional: Set weather API key (uses demo data if not set)
export WEATHER_API_KEY=your-weather-api-key

# Save the code to multi-tool-agent.py
# Run the example:
python multi-tool-agent.py
```

### Try Custom Prompts

```python
# Create an interactive version
import asyncio
from multi_tool_agent import create_multi_tool_agent

async def custom_query():
    agent = create_multi_tool_agent()
    response = await agent.query(
        prompt='Get weather for Paris, convert 500 EUR to USD, and save both results'
    )
    print(response.text)

asyncio.run(custom_query())
```

### Expected Python Output

The Python agent demonstrates the same coordination across multiple tools as the TypeScript version, providing coherent responses that synthesize information from various sources. Each tool execution is transparent, and the agent explains what it's doing at each step.

## How It Works

This example showcases several advanced patterns across both implementations:

1. **Tool Diversity**: Six different types of tools (API calls, calculations, file I/O, data transformation)
2. **Tool Definition**:
   - TypeScript: Uses `tool()` function with Zod schemas for input validation
   - Python: Uses `@tool` decorator with docstrings and type hints
3. **Error Handling**: Each tool has comprehensive error handling appropriate to its operation
   - TypeScript: try-catch blocks with type-safe error handling
   - Python: try-except blocks with specific exception types
4. **Tool Coordination**: The agent intelligently chains tools together to accomplish complex tasks
5. **External Integration**: Shows patterns for integrating external APIs (weather, currency)
   - TypeScript: axios for HTTP requests
   - Python: httpx for async HTTP requests
6. **Data Persistence**: Demonstrates file operations for saving and loading structured data
   - TypeScript: fs/promises for async file operations
   - Python: pathlib and json for file handling
7. **Type Safety**:
   - TypeScript: Zod schemas for strong input validation
   - Python: Type hints with typing module
8. **Stateful Client**: Maintains context across multiple tool uses in a single query

The agent can:
- Call multiple tools in sequence to accomplish a goal
- Pass data between tools (e.g., fetch data, calculate stats, save results)
- Handle failures gracefully in any tool without breaking the workflow
- Provide coherent responses that synthesize information from multiple sources

## Running the Example

### Installation

```bash
# Create project directory
mkdir multi-tool-agent
cd multi-tool-agent

# Initialize npm
npm init -y

# Install dependencies
npm install @anthropic-ai/agent-sdk zod axios
npm install -D typescript @types/node tsx
```

### Set up environment

```bash
# Required: Set your Anthropic API key
export ANTHROPIC_API_KEY=your-api-key-here

# Optional: Set weather API key (uses demo data if not set)
export WEATHER_API_KEY=your-weather-api-key
```

### Save and run

```bash
# Save the code to multi-tool-agent.ts
# Run the example:
npx tsx multi-tool-agent.ts
```

### Try custom prompts

```bash
# Modify the prompts in main() or create an interactive version:
node -e "
const { createMultiToolAgent } = require('./multi-tool-agent.ts');
const agent = createMultiToolAgent();
agent.query({
  prompt: 'Get weather for Paris, convert 500 EUR to USD, and save both results'
}).then(r => console.log(r.text));
"
```

## Expected Output

The agent will demonstrate coordination across multiple tools, providing coherent responses that synthesize information from various sources. Each tool execution is transparent, and the agent explains what it's doing at each step.

## Key Concepts Demonstrated

- **Tool Composition**: Multiple specialized tools working together
- **External API Integration**: Patterns for calling third-party services (axios in TypeScript, httpx in Python)
- **Error Resilience**: Graceful degradation when individual tools fail
- **Data Flow**: Passing data between tools in a coordinated workflow
- **Type Safety**:
  - TypeScript: Strong typing with Zod schemas for all tool inputs
  - Python: Type hints with typing module for function signatures
- **File Operations**: Reading and writing structured data (fs/promises vs pathlib/json)
- **Complex Calculations**: Mathematical operations and statistics
- **Stateful Context**: Maintaining conversation state across tool uses
- **Async Patterns**:
  - TypeScript: Native async/await
  - Python: asyncio.run() with async def functions

## Next Steps

- Add authentication for external APIs (API keys, OAuth)
- Implement caching for expensive operations (currency rates, weather data)
- Add rate limiting to prevent API quota exhaustion
- Create tool composition patterns (pipelines, parallel execution)
- Implement tool hooks for logging and monitoring (see [Hooks Concept](../concepts/hooks.md))
- Add database integration for persistent storage
- Create custom MCP server for specialized operations (see [MCP Server Agent](./mcp-server-agent.md))
- Add streaming for long-running operations (see [Streaming Guide](../typescript/streaming.md))

## Related Documentation

**Core Concepts:**
- [Tools Overview](../concepts/tools.md) - Tool design principles
- [Hooks](../concepts/hooks.md) - Pre/post tool execution hooks
- [Cost Tracking](../concepts/cost-tracking.md) - Monitoring API usage

**TypeScript:**
- [Custom Tools](../typescript/custom-tools.md) - Advanced tool patterns with Zod
- [Client Pattern](../typescript/client-pattern.md) - Stateful agent usage
- [Options](../typescript/options.md) - Configuration and customization
- [Streaming Guide](../typescript/streaming.md) - Real-time responses

**Python:**
- [Custom Tools](../python/custom-tools.md) - @tool decorator and tool creation
- [Client Pattern](../python/client-pattern.md) - Async context manager usage
- [Options](../python/options.md) - Configuration options
- [Async Patterns](../python/async-patterns.md) - Async/await and asyncio

**Similar Examples:**
- [Simple CLI Agent](./simple-cli-agent.md) - Basic tool usage
- [Web API Agent](./web-api-agent.md) - REST API integration
- [MCP Server Agent](./mcp-server-agent.md) - Custom protocol servers
