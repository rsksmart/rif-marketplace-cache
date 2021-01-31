
function getSortDirection (value: 1 | -1): 'ASC' | 'DESC' {
  return value > 0 ? 'ASC' : 'DESC'
}

export {
  getSortDirection
}
