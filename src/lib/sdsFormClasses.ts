/**
 * SDS Input / Form Field — docs/design-system/sds/COMPONENTS.md (Input, Textarea, Select trigger)
 */

const sdsFieldBase =
  'border border-[#e0e0e0] rounded-sds-4 px-2 text-body-m font-darwin font-book text-[#131313] placeholder-[#aaaaaa] ' +
  'bg-white hover:border-[#0183FF] focus:border-[#0183FF] focus:outline-none ' +
  'disabled:bg-[#f5f5f5] disabled:text-[#aaaaaa] disabled:cursor-not-allowed ' +
  'aria-[invalid=true]:border-red-500'

/** Single-line text, search, email, etc. */
export const sdsInput = `${sdsFieldBase} py-1.5`

/** Multi-line; vertical resize only, taller min height */
export const sdsTextarea = `${sdsFieldBase} min-h-[80px] resize-y py-2`

/** Native select — matches input field chrome */
export const sdsSelect = `${sdsFieldBase} py-1.5 bg-white`

/** Full-width select (optional chevron overlay: add appearance-none pr-9/pr-10) */
export const sdsSelectWFull = `${sdsSelect} w-full`

export const sdsLabel = 'text-body-s font-medium text-[#131313]'

export const sdsHelpText = 'text-body-s text-[#4d4d4d] mt-0.5'

export const sdsFieldError = 'text-body-s text-red-500 mt-0.5'
