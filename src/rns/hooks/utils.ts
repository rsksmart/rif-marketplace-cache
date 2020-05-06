import { HookContext } from '@feathersjs/feathers'

export function setSellerAddressParamHook (context: HookContext): HookContext {
  if (!context.params.query) {
    context.params.query = {}
  }

  if (context.params.route?.ownerAddress) {
    context.params.query.sellerAddress = context.params.route.ownerAddress.toLowerCase()
  }

  return context
}

export function setOwnerAddressParamHook (context: HookContext): HookContext {
  if (!context.params.query) {
    context.params.query = {}
  }

  if (context.params.route?.ownerAddress) {
    context.params.query.ownerAddress = context.params.route.ownerAddress.toLowerCase()
  }

  return context
}
