/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_GenericFactory_h
#define mozilla_GenericFactory_h

#include "mozilla/Attributes.h"

#include "mozilla/Module.h"

namespace mozilla {
namespace embedlite {

/**
 * A generic factory which uses a constructor function to create instances.
 * This class is intended for use by the component manager and the generic
 * module.
 */
class GenericFactory MOZ_FINAL : public nsIFactory
{
public:
  typedef Module::ConstructorProcPtr ConstructorProcPtr;

  NS_DECL_ISUPPORTS
  NS_DECL_NSIFACTORY

  GenericFactory(ConstructorProcPtr ctor)
    : mCtor(ctor)
  {
    NS_ASSERTION(mCtor, "GenericFactory with no constructor");
  }

private:
  ConstructorProcPtr mCtor;
};

} // namespace mozilla
} // namespace mozilla

#endif // mozilla_GenericFactory_h