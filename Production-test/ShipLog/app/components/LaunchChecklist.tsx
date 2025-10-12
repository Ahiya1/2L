'use client'

import * as Accordion from '@radix-ui/react-accordion'
import { ChevronDownIcon } from '@radix-ui/react-icons'
import { LaunchChecklistItem } from './LaunchChecklistItem'
import type { Launch } from '@prisma/client'

interface LaunchChecklistProps {
  productId: string
  launches: Launch[]
}

export function LaunchChecklist({ productId, launches }: LaunchChecklistProps) {
  // Default to expanding launched platforms
  const defaultOpen = launches
    .filter(l => l.launched)
    .map(l => l.platform)

  return (
    <Accordion.Root
      type="multiple"
      defaultValue={defaultOpen}
      className="space-y-2"
    >
      {launches.map((launch) => (
        <Accordion.Item
          key={launch.platform}
          value={launch.platform}
          className="border rounded-lg overflow-hidden bg-white"
        >
          <Accordion.Trigger className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  launch.launched ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className="font-medium">{launch.platform}</span>
              </div>
              {launch.launched && launch.launchDate && (
                <span className="text-xs text-gray-500">
                  {new Date(launch.launchDate).toLocaleDateString()}
                </span>
              )}
            </div>
            <ChevronDownIcon className="transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </Accordion.Trigger>

          <Accordion.Content className="p-4 pt-0 data-[state=open]:animate-accordion-open data-[state=closed]:animate-accordion-closed">
            <LaunchChecklistItem productId={productId} launch={launch} />
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}
